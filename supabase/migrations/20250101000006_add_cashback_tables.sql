-- Создаем таблицу транзакций лояльности, если её нет
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('accrual', 'withdrawal', 'exchange')),
  points INTEGER NOT NULL,
  amount DECIMAL(10,2),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем таблицу выводов кэшбека, если её нет
CREATE TABLE IF NOT EXISTS loyalty_cashbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  points_used INTEGER NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_method TEXT NOT NULL DEFAULT 'sbp',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at ON loyalty_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_cashbacks_user_id ON loyalty_cashbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_cashbacks_created_at ON loyalty_cashbacks(created_at DESC);

-- Добавляем RLS политики
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cashbacks ENABLE ROW LEVEL SECURITY;

-- Политики для loyalty_transactions
CREATE POLICY "Users can view their own transactions" ON loyalty_transactions
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR user_id = current_setting('request.jwt.claims', true)::json->>'telegram_id');

CREATE POLICY "Users can insert their own transactions" ON loyalty_transactions
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR user_id = current_setting('request.jwt.claims', true)::json->>'telegram_id');

-- Политики для loyalty_cashbacks
CREATE POLICY "Users can view their own cashbacks" ON loyalty_cashbacks
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR user_id = current_setting('request.jwt.claims', true)::json->>'telegram_id');

CREATE POLICY "Users can insert their own cashbacks" ON loyalty_cashbacks
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR user_id = current_setting('request.jwt.claims', true)::json->>'telegram_id');

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для обновления updated_at
CREATE TRIGGER update_loyalty_transactions_updated_at 
  BEFORE UPDATE ON loyalty_transactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_cashbacks_updated_at 
  BEFORE UPDATE ON loyalty_cashbacks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 