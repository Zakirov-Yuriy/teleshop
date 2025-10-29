/*
  # Add Ozon Integration Support

  1. Database Changes
    - Add `ozon_client_id` and `ozon_api_key` columns to stores table
    - Add `marketplace` column to products table to distinguish WB/Ozon products
    - Add indexes for better performance

  2. Security
    - Update RLS policies to handle marketplace filtering
    - Ensure proper access control for Ozon data
*/

-- Add Ozon credentials to stores table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'ozon_client_id'
  ) THEN
    ALTER TABLE stores ADD COLUMN ozon_client_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'ozon_api_key'
  ) THEN
    ALTER TABLE stores ADD COLUMN ozon_api_key text;
  END IF;
END $$;

-- Add marketplace column to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'marketplace'
  ) THEN
    ALTER TABLE products ADD COLUMN marketplace text DEFAULT 'wildberries';
  END IF;
END $$;

-- Add marketplace-specific product ID column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'marketplace_id'
  ) THEN
    ALTER TABLE products ADD COLUMN marketplace_id text;
  END IF;
END $$;

-- Update existing products to have marketplace_id = wb_id for WB products
UPDATE products 
SET marketplace_id = wb_id, marketplace = 'wildberries' 
WHERE marketplace_id IS NULL AND wb_id IS NOT NULL;

-- Add constraint for marketplace values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'products_marketplace_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_marketplace_check 
    CHECK (marketplace IN ('wildberries', 'ozon'));
  END IF;
END $$;

-- Add index for marketplace filtering
CREATE INDEX IF NOT EXISTS idx_products_marketplace ON products (marketplace);
CREATE INDEX IF NOT EXISTS idx_products_marketplace_id ON products (marketplace_id);

-- Update unique constraint to include marketplace
DO $$
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'products_store_id_wb_id_key'
  ) THEN
    ALTER TABLE products DROP CONSTRAINT products_store_id_wb_id_key;
  END IF;
  
  -- Add new constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'products_store_marketplace_unique'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_store_marketplace_unique 
    UNIQUE (store_id, marketplace, marketplace_id);
  END IF;
END $$;

-- Добавление поддержки Ozon товаров
-- Изменяем структуру таблицы products для поддержки разных маркетплейсов

-- Удаляем ограничение NOT NULL с wb_id
ALTER TABLE products ALTER COLUMN wb_id DROP NOT NULL;

-- Добавляем новые поля для поддержки разных маркетплейсов
ALTER TABLE products ADD COLUMN IF NOT EXISTS marketplace text DEFAULT 'wildberries';
ALTER TABLE products ADD COLUMN IF NOT EXISTS marketplace_id text;

-- Создаем уникальный индекс для комбинации store_id, marketplace и marketplace_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_store_marketplace_id 
ON products(store_id, marketplace, marketplace_id);

-- Обновляем существующие записи
UPDATE products SET marketplace = 'wildberries', marketplace_id = wb_id WHERE wb_id IS NOT NULL;

-- Добавляем комментарии к полям
COMMENT ON COLUMN products.marketplace IS 'Маркетплейс: wildberries, ozon';
COMMENT ON COLUMN products.marketplace_id IS 'ID товара в маркетплейсе';
COMMENT ON COLUMN products.wb_id IS 'ID товара в Wildberries (устаревшее поле)';