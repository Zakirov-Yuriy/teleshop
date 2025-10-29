/*
# Создание схемы платформы TeleShop

1. Новые таблицы
  - `stores` - магазины пользователей
  - `products` - товары синхронизированные с Wildberries  
  - `orders` - заказы клиентов
  - `customers` - клиенты магазинов
  - `order_items` - позиции в заказах

2. Безопасность
  - Включение RLS для всех таблиц
  - Политики доступа для владельцев магазинов
  - Ограничения на доступ к данным
*/

-- Создание таблицы магазинов
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  telegram_bot_token text NOT NULL,
  wildberries_token text NOT NULL,
  owner_id text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создание таблицы товаров
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  wb_id text NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  price decimal(10,2) NOT NULL DEFAULT 0,
  images text[] DEFAULT '{}',
  category text DEFAULT '',
  brand text DEFAULT '',
  rating decimal(3,2) DEFAULT 0,
  reviews_count integer DEFAULT 0,
  in_stock boolean DEFAULT true,
  properties jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, wb_id)
);

-- Создание таблицы клиентов
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text NOT NULL UNIQUE,
  telegram_username text,
  first_name text,
  last_name text,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создание таблицы заказов
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  delivery_address text,
  delivery_method text DEFAULT 'delivery',
  payment_method text DEFAULT 'cash',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создание таблицы позиций заказов
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для всех таблиц
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Политики для магазинов
CREATE POLICY "Владельцы могут управлять своими магазинами"
  ON stores
  FOR ALL
  TO authenticated
  USING (owner_id = auth.jwt() ->> 'sub');

-- Политики для товаров
CREATE POLICY "Владельцы могут управлять товарами своих магазинов"
  ON products
  FOR ALL
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.jwt() ->> 'sub'
    )
  );

-- Политики для клиентов
CREATE POLICY "Владельцы магазинов могут видеть своих клиентов"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT DISTINCT customer_id FROM orders
      WHERE store_id IN (
        SELECT id FROM stores WHERE owner_id = auth.jwt() ->> 'sub'
      )
    )
  );

-- Политики для заказов
CREATE POLICY "Владельцы могут управлять заказами своих магазинов"
  ON orders
  FOR ALL
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.jwt() ->> 'sub'
    )
  );

-- Политики для позиций заказов
CREATE POLICY "Владельцы могут видеть позиции заказов своих магазинов"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE store_id IN (
        SELECT id FROM stores WHERE owner_id = auth.jwt() ->> 'sub'
      )
    )
  );

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_wb_id ON products(wb_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_customers_telegram_id ON customers(telegram_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();