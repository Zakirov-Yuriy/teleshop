/*
  # Add Stock and Additional Fields for Ozon Products

  1. Database Changes
    - Add `stock` column to products table for inventory tracking
    - Add `old_price` column for price history
    - Add `reserved` column for reserved inventory
    - Add `sku` column for marketplace-specific SKU

  2. Purpose
    - Support Ozon product synchronization
    - Track inventory levels across marketplaces
    - Maintain price history for analytics
*/

-- Add stock column for inventory tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'stock'
  ) THEN
    ALTER TABLE products ADD COLUMN stock integer DEFAULT 0;
  END IF;
END $$;

-- Add old_price column for price history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'old_price'
  ) THEN
    ALTER TABLE products ADD COLUMN old_price decimal(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add reserved column for reserved inventory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'reserved'
  ) THEN
    ALTER TABLE products ADD COLUMN reserved integer DEFAULT 0;
  END IF;
END $$;

-- Add sku column for marketplace-specific SKU
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'sku'
  ) THEN
    ALTER TABLE products ADD COLUMN sku text;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_stock ON products (stock);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);

-- Add comments for documentation
COMMENT ON COLUMN products.stock IS 'Количество товара в наличии';
COMMENT ON COLUMN products.old_price IS 'Старая цена товара';
COMMENT ON COLUMN products.reserved IS 'Количество зарезервированного товара';
COMMENT ON COLUMN products.sku IS 'SKU товара в маркетплейсе'; 