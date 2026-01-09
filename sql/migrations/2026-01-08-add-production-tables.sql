-- Migration: Add weight_per_unit and production_runs table
alter table if exists products add column if not exists weight_per_unit float default 0;

-- Create production_runs table if it doesn't exist
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

-- Create waste report view
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
