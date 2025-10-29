-- RLS policy to allow employees to see owner's products
alter table if exists public.products enable row level security;

drop policy if exists products_owner_select on public.products;
create policy products_owner_select on public.products
  for select using (
    exists (
      select 1 from public.stores s
      where s.id = products.store_id
        and (
          s.owner_id::text = auth.uid()::text
          or (
            coalesce(auth.jwt() -> 'app_metadata' ->> 'role','') = 'employee'
            and (auth.jwt() -> 'app_metadata' ->> 'owner_id')::text = s.owner_id::text
          )
        )
    )
  );


