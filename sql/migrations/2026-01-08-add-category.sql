-- Migration: add category column to products
alter table if exists products add column if not exists category text not null default 'general';

-- Optionally mark known raw materials (example):
-- update products set category = 'raw_material' where material in ('paper','plastic','bioplastic');
