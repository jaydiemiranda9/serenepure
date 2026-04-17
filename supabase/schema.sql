-- ============================================================
-- THE SERENE DROPS — Water Refilling Station Database Schema
-- ============================================================
-- Run this in the Supabase SQL Editor ONCE to set up everything.
-- After running, you can start using the app immediately.
-- ============================================================

-- Clean slate (safe to re-run)
drop table if exists sale_items cascade;
drop table if exists sales cascade;
drop table if exists expenses cascade;
drop table if exists customers cascade;
drop table if exists settings cascade;

-- ============================================================
-- CUSTOMERS (regulars only — walk-ins are not stored)
-- ============================================================
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  notes text,                           -- e.g. "gate code 1234, prefers morning delivery"
  containers_out int not null default 0, -- how many of YOUR gallons they currently have
  deposit_paid numeric(10,2) not null default 0, -- total deposit held on file
  created_at timestamptz not null default now(),
  archived boolean not null default false
);
create index customers_name_idx on customers (name);
create index customers_archived_idx on customers (archived);

-- ============================================================
-- SALES (one row per transaction)
-- ============================================================
create table sales (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null, -- null = walk-in
  channel text not null check (channel in ('walk-in', 'delivery')),
  payment_method text not null check (payment_method in ('cash', 'gcash')),
  subtotal numeric(10,2) not null,      -- gallons only
  deposit_amount numeric(10,2) not null default 0, -- new containers taken
  deposit_refund numeric(10,2) not null default 0, -- containers returned
  total numeric(10,2) not null,         -- subtotal + deposit_amount - deposit_refund
  notes text,
  created_at timestamptz not null default now()
);
create index sales_created_at_idx on sales (created_at desc);
create index sales_customer_idx on sales (customer_id);
create index sales_channel_idx on sales (channel);

-- ============================================================
-- SALE ITEMS (gallons sold in each sale)
-- ============================================================
create table sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  gallon_type text not null check (gallon_type in ('round', 'slim', 'dispenser')),
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price > 0),
  line_total numeric(10,2) not null
);
create index sale_items_sale_idx on sale_items (sale_id);

-- ============================================================
-- EXPENSES
-- ============================================================
create table expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,   -- electricity, filter, salt, fuel, maintenance, supplies, other
  amount numeric(10,2) not null check (amount > 0),
  description text,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);
create index expenses_date_idx on expenses (expense_date desc);
create index expenses_category_idx on expenses (category);

-- ============================================================
-- SETTINGS (single row, key-value style)
-- ============================================================
create table settings (
  id int primary key default 1 check (id = 1), -- enforces single row
  business_name text not null default 'The Serene Drops',
  location text not null default 'Mabalacat City',
  default_price_round numeric(10,2) not null default 30,
  default_price_slim numeric(10,2) not null default 30,
  default_price_dispenser numeric(10,2) not null default 30,
  default_deposit numeric(10,2) not null default 200,
  price_min_warn numeric(10,2) not null default 10,
  price_max_warn numeric(10,2) not null default 100,
  updated_at timestamptz not null default now()
);

-- Seed the settings row with defaults
insert into settings (id) values (1) on conflict do nothing;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- This is a single-owner family app. We enable RLS and allow
-- ALL operations for ANY authenticated user. That means once
-- someone logs in (you + family via magic link), they can do
-- everything. No roles, no complexity.
-- ============================================================

alter table customers enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table expenses enable row level security;
alter table settings enable row level security;

-- Customers
create policy "auth_read_customers" on customers for select to authenticated using (true);
create policy "auth_insert_customers" on customers for insert to authenticated with check (true);
create policy "auth_update_customers" on customers for update to authenticated using (true);
create policy "auth_delete_customers" on customers for delete to authenticated using (true);

-- Sales
create policy "auth_read_sales" on sales for select to authenticated using (true);
create policy "auth_insert_sales" on sales for insert to authenticated with check (true);
create policy "auth_update_sales" on sales for update to authenticated using (true);
create policy "auth_delete_sales" on sales for delete to authenticated using (true);

-- Sale items
create policy "auth_read_items" on sale_items for select to authenticated using (true);
create policy "auth_insert_items" on sale_items for insert to authenticated with check (true);
create policy "auth_update_items" on sale_items for update to authenticated using (true);
create policy "auth_delete_items" on sale_items for delete to authenticated using (true);

-- Expenses
create policy "auth_read_expenses" on expenses for select to authenticated using (true);
create policy "auth_insert_expenses" on expenses for insert to authenticated with check (true);
create policy "auth_update_expenses" on expenses for update to authenticated using (true);
create policy "auth_delete_expenses" on expenses for delete to authenticated using (true);

-- Settings
create policy "auth_read_settings" on settings for select to authenticated using (true);
create policy "auth_update_settings" on settings for update to authenticated using (true);

-- ============================================================
-- HELPER VIEWS for reports
-- ============================================================

create or replace view v_daily_summary as
select
  date(created_at at time zone 'Asia/Manila') as day,
  count(*) as sale_count,
  sum(subtotal) as gross_sales,
  sum(case when payment_method = 'cash' then total else 0 end) as cash_total,
  sum(case when payment_method = 'gcash' then total else 0 end) as gcash_total,
  sum(case when channel = 'walk-in' then subtotal else 0 end) as walkin_sales,
  sum(case when channel = 'delivery' then subtotal else 0 end) as delivery_sales,
  sum(deposit_amount) as deposits_collected,
  sum(deposit_refund) as deposits_refunded
from sales
group by date(created_at at time zone 'Asia/Manila')
order by day desc;

-- ============================================================
-- DONE. Go to Authentication → Providers and enable Email
-- (magic link is enabled by default with Email provider).
-- ============================================================
