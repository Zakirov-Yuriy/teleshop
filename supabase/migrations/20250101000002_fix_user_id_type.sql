-- Удаляем политику перед изменением типа колонки
DROP POLICY IF EXISTS "Users can manage own wb sessions" ON wb_sessions;

-- Изменение типа колонки user_id с UUID на TEXT
ALTER TABLE wb_sessions ALTER COLUMN user_id TYPE TEXT;

-- Создаем политику заново с правильным типом
CREATE POLICY "Users can manage own wb sessions" ON wb_sessions
  FOR ALL USING (auth.uid()::text = user_id); 