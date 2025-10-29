-- Исправление RLS политики для wb_sessions
-- Проблема: auth.uid() возвращает UUID, а user_id - строка

-- Удаляем старую политику
DROP POLICY IF EXISTS "Users can manage own wb sessions" ON wb_sessions;

-- Создаем новую политику с правильным сравнением
CREATE POLICY "Users can manage own wb sessions" ON wb_sessions
  FOR ALL USING (user_id = auth.uid()::text);

-- Также создаем политику для аутентифицированных пользователей
CREATE POLICY "Authenticated users can read wb sessions" ON wb_sessions
  FOR SELECT TO authenticated USING (true);

-- Service role политика остается без изменений 