-- Создание таблицы для хранения сессий Wildberries
CREATE TABLE IF NOT EXISTS wb_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  validation_key TEXT,
  user_info JSONB,
  cookies JSONB DEFAULT '{}',
  sticker TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Индексы для производительности
CREATE INDEX idx_wb_sessions_user_id ON wb_sessions(user_id);
CREATE INDEX idx_wb_sessions_updated_at ON wb_sessions(updated_at);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_wb_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_wb_sessions_updated_at_trigger
  BEFORE UPDATE ON wb_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_wb_sessions_updated_at();

-- RLS политики
ALTER TABLE wb_sessions ENABLE ROW LEVEL SECURITY;

-- Пользователи могут управлять только своими сессиями
CREATE POLICY "Users can manage own wb sessions" ON wb_sessions
  FOR ALL USING (auth.uid()::text = user_id);

-- Service role может управлять всеми сессиями
CREATE POLICY "Service role can manage all wb sessions" ON wb_sessions
  FOR ALL USING (auth.role() = 'service_role'); 