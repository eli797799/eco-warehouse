-- Migration: Add recipes table (Bill of Materials)
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  finished_product_id uuid not null references products(id) on delete cascade,
  raw_material_id uuid not null references products(id) on delete cascade,
  quantity_needed float not null check (quantity_needed > 0),
  created_at timestamptz not null default now()
);
