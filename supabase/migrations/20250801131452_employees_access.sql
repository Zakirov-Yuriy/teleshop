-- RLS policies to allow employees (auth.jwt().app_metadata.role = 'employee')
-- to read data that belongs to their owner's stores

-- STORES: allow select for owner and employees of owner
alter table if exists public.stores enable row level security;

drop policy if exists stores_owner_select on public.stores;
create policy stores_owner_select on public.stores
  for select using (
    auth.uid()::text = owner_id::text
    or (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'role','') = 'employee'
      and (auth.jwt() -> 'app_metadata' ->> 'owner_id')::text = owner_id::text
    )
  );

-- ORDERS: allow select if order belongs to a store of owner/employee-owner
alter table if exists public.orders enable row level security;

drop policy if exists orders_owner_select on public.orders;
create policy orders_owner_select on public.orders
  for select using (
    exists (
      select 1 from public.stores s
      where s.id = orders.store_id
        and (
          s.owner_id::text = auth.uid()::text
          or (
            coalesce(auth.jwt() -> 'app_metadata' ->> 'role','') = 'employee'
            and (auth.jwt() -> 'app_metadata' ->> 'owner_id')::text = s.owner_id::text
          )
        )
    )
    or orders.store_id is null -- allow reading orphaned synced orders
  );

-- CUSTOMERS: allow select if there exists at least one order for this customer linked to owner's store
alter table if exists public.customers enable row level security;

drop policy if exists customers_owner_select on public.customers;
create policy customers_owner_select on public.customers
  for select using (
    exists (
      select 1
      from public.orders o
      join public.stores s on s.id = o.store_id
      where o.customer_id = customers.id
        and (
          s.owner_id::text = auth.uid()::text
          or (
            coalesce(auth.jwt() -> 'app_metadata' ->> 'role','') = 'employee'
            and (auth.jwt() -> 'app_metadata' ->> 'owner_id')::text = s.owner_id::text
          )
        )
    )
  );

-- ORDER_ITEMS: allow select if parent order accessible
alter table if exists public.order_items enable row level security;

drop policy if exists order_items_owner_select on public.order_items;
create policy order_items_owner_select on public.order_items
  for select using (
    exists (
      select 1
      from public.orders o
      join public.stores s on s.id = o.store_id
      where o.id = order_items.order_id
        and (
          s.owner_id::text = auth.uid()::text
          or (
            coalesce(auth.jwt() -> 'app_metadata' ->> 'role','') = 'employee'
            and (auth.jwt() -> 'app_metadata' ->> 'owner_id')::text = s.owner_id::text
          )
        )
    )
    or exists (
      select 1 from public.orders o2
      where o2.id = order_items.order_id and o2.store_id is null
    )
  );


