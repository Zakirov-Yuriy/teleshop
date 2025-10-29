-- Включаем RLS для таблицы wb_sessions
ALTER TABLE wb_sessions ENABLE ROW LEVEL SECURITY;

-- Создаем политику для чтения сессий пользователями
CREATE POLICY "Пользователи могут читать свои сессии"
  ON wb_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Создаем политику для создания/обновления сессий пользователями
CREATE POLICY "Пользователи могут управлять своими сессиями"
  ON wb_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Создаем политику для сервисной роли (для Edge Functions)
CREATE POLICY "Сервисная роль может управлять всеми сессиями"
  ON wb_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true); 