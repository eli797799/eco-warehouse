-- Supabase schema for Eco Cuplate Warehouse Management System
-- Run this in your Supabase SQL editor

-- enable pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- products table
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,
  size text,
  material text,
  category text not null default 'general',
  current_stock integer not null default 0,
  low_stock_threshold integer not null default 0,
  weight_per_unit float default 0,
  created_at timestamptz not null default now()
);

-- movements table (stock in / out)
create table if not exists movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  type text not null check (type in ('IN','OUT')),
  quantity integer not null check (quantity >= 0),
  date timestamptz not null default now(),
  notes text
);

-- shipping documents
create table if not exists shipping_docs (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  doc_number text unique,
  date timestamptz not null default now(),
  status text default 'DRAFT'
);

-- shipping items
create table if not exists shipping_items (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid references shipping_docs(id) on delete cascade,
  product_id uuid references products(id) on delete restrict,
  quantity integer not null check (quantity >= 0)
);

-- Trigger to keep products.current_stock consistent with movements
create or replace function fn_adjust_product_stock() returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    if (new.type = 'IN') then
      update products set current_stock = current_stock + new.quantity where id = new.product_id;
    else
      update products set current_stock = current_stock - new.quantity where id = new.product_id;
    end if;
    return new;
  elsif (tg_op = 'UPDATE') then
    -- revert old
    if (old.type = 'IN') then
      update products set current_stock = current_stock - old.quantity where id = old.product_id;
    else
      update products set current_stock = current_stock + old.quantity where id = old.product_id;
    end if;
    -- apply new
    if (new.type = 'IN') then
      update products set current_stock = current_stock + new.quantity where id = new.product_id;
    else
      update products set current_stock = current_stock - new.quantity where id = new.product_id;
    end if;
    return new;
  elsif (tg_op = 'DELETE') then
    if (old.type = 'IN') then
      update products set current_stock = current_stock - old.quantity where id = old.product_id;
    else
      update products set current_stock = current_stock + old.quantity where id = old.product_id;
    end if;
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_movements_adjust on movements;
create trigger trg_movements_adjust
after insert or update or delete on movements
for each row execute function fn_adjust_product_stock();

-- production_runs table (tracks each production cycle)
create table if not exists production_runs (
  id uuid primary key default gen_random_uuid(),
  raw_material_id uuid references products(id) on delete restrict,
  raw_material_quantity float not null check (raw_material_quantity >= 0),
  finished_product_id uuid references products(id) on delete restrict,
  finished_product_quantity integer not null check (finished_product_quantity >= 0),
  theoretical_output_weight float not null,
  waste_quantity float not null,
  waste_percentage float not null,
  created_at timestamptz not null default now()
);

-- waste_logs table (dedicated waste tracking from production)
create table if not exists waste_logs (
  id uuid primary key default gen_random_uuid(),
  raw_material_id uuid references products(id) on delete restrict,
  raw_material_quantity float not null check (raw_material_quantity >= 0),
  finished_product_id uuid references products(id) on delete restrict,
  finished_product_quantity integer not null check (finished_product_quantity >= 0),
  waste_quantity float not null,
  waste_percentage float not null,
  created_at timestamptz not null default now()
);

-- View to help with waste calculation
create or replace view vw_waste_summary as
select
  coalesce((select sum(quantity) from movements where type = 'IN'),0) as total_produced,
  coalesce((select sum(quantity) from movements where type = 'OUT'),0) as total_shipped,
  coalesce((select sum(current_stock) from products),0) as current_stock,
  (coalesce((select sum(quantity) from movements where type = 'IN'),0)
    - coalesce((select sum(quantity) from movements where type = 'OUT'),0)
    - coalesce((select sum(current_stock) from products),0)) as waste
;

-- View: Production Waste Report (aggregated by day)
create or replace view vw_waste_report as
select
  date_trunc('day', pr.created_at) as waste_day,
  count(*) as run_count,
  sum(pr.waste_quantity) as total_waste,
  round(avg(pr.waste_percentage)::numeric, 2) as avg_waste_percent,
  max(pr.waste_percentage) as max_waste_percent,
  min(pr.waste_percentage) as min_waste_percent
from production_runs pr
group by date_trunc('day', pr.created_at)
order by waste_day desc;
