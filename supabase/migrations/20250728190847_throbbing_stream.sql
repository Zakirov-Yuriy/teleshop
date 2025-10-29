/*
  # Обновление политики безопасности для магазинов
  
  1. Изменения
    - Обновляем политику для использования auth.uid() вместо jwt()
    - Добавляем политику для создания магазинов
  
  2. Безопасность
    - Пользователи могут управлять только своими магазинами
    - Автоматическое присвоение owner_id при создании
*/

-- Удаляем старую политику
DROP POLICY IF EXISTS "Владельцы могут управлять своими " ON stores;

-- Создаем новые политики
CREATE POLICY "Пользователи могут просматривать свои магазины"
  ON stores
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid()::text);

CREATE POLICY "Пользователи могут создавать магазины"
  ON stores
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid()::text);

CREATE POLICY "Пользователи могут обновлять свои магазины"
  ON stores
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid()::text)
  WITH CHECK (owner_id = auth.uid()::text);

CREATE POLICY "Пользователи могут удалять свои магазины"
  ON stores
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid()::text);

-- Обновляем политики для продуктов
DROP POLICY IF EXISTS "Владельцы могут управлять товарам" ON products;

CREATE POLICY "Владельцы могут управлять товарами своих магазинов"
  ON products
  FOR ALL
  TO authenticated
  USING (store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()::text
  ))
  WITH CHECK (store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()::text
  ));

-- Обновляем политики для заказов
DROP POLICY IF EXISTS "Владельцы могут управлять заказам" ON orders;

CREATE POLICY "Владельцы могут управлять заказами своих магазинов"
  ON orders
  FOR ALL
  TO authenticated
  USING (store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()::text
  ))
  WITH CHECK (store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()::text
  ));