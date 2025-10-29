-- Таблица для отслеживания активности пользователей в мини-приложении
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id TEXT NOT NULL,
  activity_type TEXT NOT NULL, -- 'view_product', 'add_to_cart', 'remove_from_cart', 'view_cart', 'checkout_start', 'auth_success', 'auth_failed', 'search', 'category_view'
  activity_data JSONB, -- Дополнительные данные о действии
  session_id TEXT, -- ID сессии пользователя
  user_agent TEXT, -- User-Agent браузера
  ip_address TEXT, -- IP адрес пользователя
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_telegram_id ON user_activity_logs(telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);

-- Таблица для уведомлений пользователям
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id TEXT NOT NULL,
  notification_type TEXT NOT NULL, -- 'abandoned_cart', 'promotion', 'new_product', 'order_status', 'loyalty_points', 'custom'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT, -- URL для кнопки действия
  action_text TEXT, -- Текст кнопки действия
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для уведомлений
CREATE INDEX IF NOT EXISTS idx_user_notifications_telegram_id ON user_notifications(telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_sent ON user_notifications(is_sent);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at);

-- Таблица для шаблонов уведомлений
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL, -- 'abandoned_cart', 'promotion_50', 'new_product_launch'
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  action_url_template TEXT,
  action_text_template TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для шаблонов
CREATE INDEX IF NOT EXISTS idx_notification_templates_key ON notification_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);

-- Триггеры для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_activity_logs_updated_at 
  BEFORE UPDATE ON user_activity_logs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notifications_updated_at 
  BEFORE UPDATE ON user_notifications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at 
  BEFORE UPDATE ON notification_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Вставка начальных шаблонов уведомлений
INSERT INTO notification_templates (template_key, title_template, message_template, action_url_template, action_text_template) VALUES
('abandoned_cart', '🛒 Забыли что-то?', 'В вашей корзине остались товары. Завершите покупку и получите баллы лояльности!', 'https://teleshop.su/miniapp/{store_id}', 'Открыть корзину'),
('promotion_50', '🔥 Горячая распродажа!', 'Скидка 50% на все товары! Успейте до конца недели.', 'https://teleshop.su/miniapp/{store_id}?promo=50', 'Посмотреть акции'),
('new_product_launch', '🆕 Новинка!', 'У нас появился новый товар "{product_name}". Будьте первыми!', 'https://teleshop.su/miniapp/{store_id}/product/{product_id}', 'Посмотреть товар'),
('loyalty_points', '💎 Ваши баллы ждут!', 'У вас накопилось {points} баллов. Обменяйте их на кэшбэк!', 'https://t.me/{bot_username}?start=points', 'Проверить баллы'),
('order_status', '📦 Статус заказа', 'Ваш заказ №{order_id} {status}.', 'https://teleshop.su/miniapp/{store_id}/order/{order_id}', 'Отследить заказ');

-- Функция для логирования активности пользователя
CREATE OR REPLACE FUNCTION log_user_activity(
  p_telegram_id TEXT,
  p_activity_type TEXT,
  p_activity_data JSONB DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO user_activity_logs (
    telegram_id, 
    activity_type, 
    activity_data, 
    session_id, 
    user_agent, 
    ip_address
  ) VALUES (
    p_telegram_id,
    p_activity_type,
    p_activity_data,
    p_session_id,
    p_user_agent,
    p_ip_address
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Функция для создания уведомления
CREATE OR REPLACE FUNCTION create_user_notification(
  p_telegram_id TEXT,
  p_notification_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_action_text TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO user_notifications (
    telegram_id,
    notification_type,
    title,
    message,
    action_url,
    action_text
  ) VALUES (
    p_telegram_id,
    p_notification_type,
    p_title,
    p_message,
    p_action_url,
    p_action_text
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Функция для массовой отправки уведомлений
CREATE OR REPLACE FUNCTION send_bulk_notifications(
  p_notification_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_action_text TEXT DEFAULT NULL,
  p_telegram_ids TEXT[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  INSERT INTO user_notifications (
    telegram_id,
    notification_type,
    title,
    message,
    action_url,
    action_text
  )
  SELECT 
    lu.telegram_id,
    p_notification_type,
    p_title,
    p_message,
    p_action_url,
    p_action_text
  FROM loyalty_users lu
  WHERE (p_telegram_ids IS NULL OR lu.telegram_id = ANY(p_telegram_ids))
    AND lu.telegram_id IS NOT NULL;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql; 