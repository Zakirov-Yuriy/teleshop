/*
  # Обновление RLS политики для таблицы products
  
  Позволяет анонимным пользователям (мини-приложение) просматривать товары активных магазинов.
  
  1. Изменения
     - Обновляем политику SELECT для таблицы products
     - Разрешаем анонимный доступ к товарам активных магазинов
     - Сохраняем доступ владельцев к своим товарам
*/

-- Удаляем старую политику SELECT для products
DROP POLICY IF EXISTS "Владельцы могут управлять товарам" ON products;

-- Создаем новую политику SELECT для products
CREATE POLICY "Allow viewing products from active stores"
  ON products
  FOR SELECT
  USING (
    -- Анонимные пользователи могут видеть товары из активных магазинов
    store_id IN (
      SELECT id FROM stores WHERE status = 'active'
    )
    OR
    -- Аутентифицированные пользователи могут видеть товары из своих магазинов
    (
      auth.uid() IS NOT NULL 
      AND store_id IN (
        SELECT id FROM stores WHERE owner_id = auth.uid()::text
      )
    )
  );

-- Создаем отдельные политики для других операций (INSERT, UPDATE, DELETE) только для владельцев
CREATE POLICY "Owners can manage their products"
  ON products
  FOR ALL
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()::text
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()::text
    )
  );