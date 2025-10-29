alter table if exists public.order_items
  add column if not exists marketplace_id text,
  add column if not exists product_name_cache text,
  add column if not exists product_image_cache text;


