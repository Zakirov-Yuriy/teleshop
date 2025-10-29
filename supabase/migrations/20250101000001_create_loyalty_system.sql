-- Создание таблиц для бонусной системы лояльности "Easy-Баллы"

-- Таблица пользователей лояльности
CREATE TABLE IF NOT EXISTS loyalty_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    total_points INTEGER DEFAULT 0,
    available_points INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    cashback_cycles INTEGER DEFAULT 0,
    last_cashback_date TIMESTAMP WITH TIME ZONE,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица транзакций баллов
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES loyalty_users(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'expire', 'adjust')),
    points INTEGER NOT NULL,
    order_id TEXT,
    marketplace TEXT,
    order_amount DECIMAL(10,2),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица выплат кэшбэка
CREATE TABLE IF NOT EXISTS loyalty_cashbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES loyalty_users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount IN (50, 100, 150)),
    points_spent INTEGER NOT NULL,
    points_remaining INTEGER NOT NULL,
    phone_number TEXT NOT NULL,
    payment_provider TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'success', 'failed', 'cancelled')),
    payment_id TEXT,
    payment_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Таблица настроек системы лояльности
CREATE TABLE IF NOT EXISTS loyalty_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица баланса платформы
CREATE TABLE IF NOT EXISTS platform_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    current_balance DECIMAL(10,2) DEFAULT 0,
    total_deposited DECIMAL(10,2) DEFAULT 0,
    total_paid_out DECIMAL(10,2) DEFAULT 0,
    last_deposit_date TIMESTAMP WITH TIME ZONE,
    last_payout_date TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица уведомлений администратора
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_loyalty_users_telegram_id ON loyalty_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at ON loyalty_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_loyalty_cashbacks_user_id ON loyalty_cashbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_cashbacks_status ON loyalty_cashbacks(payment_status);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_loyalty_users_updated_at BEFORE UPDATE ON loyalty_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loyalty_settings_updated_at BEFORE UPDATE ON loyalty_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_platform_balance_updated_at BEFORE UPDATE ON platform_balance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Вставка начальных настроек
INSERT INTO loyalty_settings (setting_key, setting_value, description) VALUES
('points_rules', '{"registration_bonus": 30, "order_thresholds": [{"max": 200, "points": 10}, {"max": 500, "points": 40}, {"max": 700, "points": 60}, {"min": 1000, "points": 90}], "points_expiry_days": 90, "cashback_limits": {"daily": 1, "min_orders_before_first": 2, "orders_after_cashback": 1}}', 'Правила начисления баллов и кэшбэка'),
('cashback_options', '{"50": {"points_required": 50, "points_spent": 45, "points_remaining": 5}, "100": {"points_required": 100, "points_spent": 90, "points_remaining": 10}, "150": {"points_required": 150, "points_spent": 130, "points_remaining": 20}}', 'Опции кэшбэка'),
('payment_provider', '{"name": "tinkoff", "api_key": "", "webhook_secret": ""}', 'Настройки платежного провайдера'),
('notifications', '{"low_balance_threshold": 10000, "balance_decrease_threshold": 1000, "admin_telegram_id": ""}', 'Настройки уведомлений');

-- Вставка начального баланса платформы
INSERT INTO platform_balance (current_balance, total_deposited, total_paid_out) VALUES (0, 0, 0);

-- Функция для начисления баллов за заказ
CREATE OR REPLACE FUNCTION calculate_order_points(order_amount DECIMAL)
RETURNS INTEGER AS $$
DECLARE
    points INTEGER := 0;
BEGIN
    IF order_amount <= 200 THEN
        points := 10;
    ELSIF order_amount <= 500 THEN
        points := 40;
    ELSIF order_amount <= 700 THEN
        points := 60;
    ELSIF order_amount >= 1000 THEN
        points := 90;
    END IF;
    
    RETURN points;
END;
$$ LANGUAGE plpgsql;

-- Функция для проверки возможности кэшбэка
CREATE OR REPLACE FUNCTION can_request_cashback(user_telegram_id TEXT)
RETURNS JSONB AS $$
DECLARE
    user_record RECORD;
    result JSONB;
BEGIN
    SELECT * INTO user_record FROM loyalty_users WHERE telegram_id = user_telegram_id;
    
    IF NOT FOUND THEN
        RETURN '{"can_request": false, "reason": "user_not_found"}'::JSONB;
    END IF;
    
    -- Проверяем минимальное количество заказов для первого кэшбэка
    IF user_record.cashback_cycles = 0 AND user_record.completed_orders < 2 THEN
        RETURN jsonb_build_object(
            'can_request', false,
            'reason', 'insufficient_orders',
            'required_orders', 2,
            'current_orders', user_record.completed_orders
        );
    END IF;
    
    -- Проверяем доступные баллы
    IF user_record.available_points < 50 THEN
        RETURN jsonb_build_object(
            'can_request', false,
            'reason', 'insufficient_points',
            'required_points', 50,
            'available_points', user_record.available_points
        );
    END IF;
    
    -- Проверяем дневной лимит
    IF user_record.last_cashback_date IS NOT NULL AND 
       user_record.last_cashback_date > NOW() - INTERVAL '1 day' THEN
        RETURN jsonb_build_object(
            'can_request', false,
            'reason', 'daily_limit_reached',
            'next_available', user_record.last_cashback_date + INTERVAL '1 day'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'can_request', true,
        'available_points', user_record.available_points,
        'cashback_options', (
            SELECT setting_value FROM loyalty_settings WHERE setting_key = 'cashback_options'
        )
    );
END;
$$ LANGUAGE plpgsql; 