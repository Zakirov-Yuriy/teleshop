-- создание таблиц и индексов для системы покупок

-- 1. Таблица пользователей (если еще не существует)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Таблица настроек пользователей для маркетплейсов
CREATE TABLE user_marketplace_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL CHECK (marketplace IN ('wildberries', 'ozon')),
  
  -- Флаги наличия настроек
  has_payment_method BOOLEAN DEFAULT FALSE,
  has_delivery_address BOOLEAN DEFAULT FALSE,
  has_credentials BOOLEAN DEFAULT FALSE,
  
  -- Зашифрованные данные для входа (опционально)
  encrypted_email TEXT,
  encrypted_password TEXT,
  cookies_data JSONB,
  
  -- Настройки доставки и оплаты
  payment_method_info JSONB,
  delivery_address_info JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, marketplace)
);

-- 3. Таблица заказов
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  
  -- Информация о маркетплейсе
  marketplace TEXT NOT NULL CHECK (marketplace IN ('wildberries', 'ozon')),
  marketplace_order_id TEXT,
  
  -- Данные о товарах
  products_data JSONB NOT NULL,
  total_amount DECIMAL(10,2),
  
  -- Статус заказа
  status TEXT DEFAULT 'processing' CHECK (status IN (
    'processing',    -- обрабатывается
    'confirmed',     -- подтвержден
    'paid',         -- оплачен
    'shipped',      -- отправлен
    'delivered',    -- доставлен
    'cancelled',    -- отменен
    'failed'        -- ошибка
  )),
  
  -- Дополнительная информация
  tracking_number TEXT,
  payment_method TEXT,
  delivery_address TEXT,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Таблица попыток покупок (для аналитики)
CREATE TABLE purchase_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  
  marketplace TEXT NOT NULL,
  products_data JSONB NOT NULL,
  scenario TEXT NOT NULL CHECK (scenario IN ('browser', 'auto_purchase')),
  
  -- Результат попытки
  success BOOLEAN DEFAULT FALSE,
  order_id TEXT,
  action_url TEXT,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Таблица логов статусов заказов
CREATE TABLE order_status_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  
  old_status TEXT,
  new_status TEXT NOT NULL,
  
  -- Источник обновления
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'api', 'webhook', 'selenium')),
  source_data JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы для производительности
CREATE INDEX idx_user_marketplace_settings_user_marketplace 
  ON user_marketplace_settings(user_id, marketplace);

CREATE INDEX idx_orders_user_marketplace 
  ON orders(user_id, marketplace);

CREATE INDEX idx_orders_status 
  ON orders(status);

CREATE INDEX idx_orders_marketplace_order_id 
  ON orders(marketplace, marketplace_order_id);

CREATE INDEX idx_purchase_attempts_user_store 
  ON purchase_attempts(user_id, store_id);

CREATE INDEX idx_order_status_logs_order_id 
  ON order_status_logs(order_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_marketplace_settings_updated_at 
  BEFORE UPDATE ON user_marketplace_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON orders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для логирования изменений статуса заказа
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_logs (order_id, old_status, new_status, source)
        VALUES (NEW.id, OLD.status, NEW.status, 'manual');
    END IF;
    RETURN NEW;
END;
$ language 'plpgsql';

-- Триггер для автоматического логирования изменений статуса
CREATE TRIGGER log_order_status_change_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- RLS (Row Level Security) политики
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_marketplace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_logs ENABLE ROW LEVEL SECURITY;

-- Политики доступа для пользователей (через Telegram ID)
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.jwt() ->> 'telegram_id' = telegram_id::text);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.jwt() ->> 'telegram_id' = telegram_id::text);

-- Политики для настроек маркетплейсов
CREATE POLICY "Users can manage own marketplace settings" ON user_marketplace_settings
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users 
      WHERE telegram_id::text = auth.jwt() ->> 'telegram_id'
    )
  );

-- Политики для заказов
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users 
      WHERE telegram_id::text = auth.jwt() ->> 'telegram_id'
    )
  );

CREATE POLICY "Service role can manage all orders" ON orders
  FOR ALL USING (auth.role() = 'service_role');

-- Политики для попыток покупок
CREATE POLICY "Users can view own purchase attempts" ON purchase_attempts
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users 
      WHERE telegram_id::text = auth.jwt() ->> 'telegram_id'
    )
  );

-- Политики для логов статусов
CREATE POLICY "Users can view own order status logs" ON order_status_logs
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE u.telegram_id::text = auth.jwt() ->> 'telegram_id'
    )
  );

-- Вставляем начальные данные для тестирования (опционально)
INSERT INTO users (telegram_id, first_name, created_at) 
VALUES ('12345', 'Test User', NOW())
ON CONFLICT (telegram_id) DO NOTHING;