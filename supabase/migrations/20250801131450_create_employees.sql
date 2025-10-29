create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  role text not null default 'Сотрудник',
  status text not null default 'active',
  department text,
  salary numeric not null default 0,
  permissions text[] not null default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.employees enable row level security;

create policy employees_owner_isolation on public.employees
  for select using (auth.uid() = owner_id or auth.jwt() ->> 'role' = 'service_role');

create policy employees_owner_insert on public.employees
  for insert with check (auth.uid() = owner_id or auth.jwt() ->> 'role' = 'service_role');

create policy employees_owner_update on public.employees
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy employees_owner_delete on public.employees
  for delete using (auth.uid() = owner_id or auth.jwt() ->> 'role' = 'service_role');


