-- Migration: Add financial tracking to inventory system
-- Date: 2026-01-08
-- Adds: price_per_unit, currency, selling_price support

-- Add price_per_unit and currency to inventory_movements
ALTER TABLE inventory_movements
ADD COLUMN price_per_unit numeric DEFAULT 0 CHECK (price_per_unit >= 0);

ALTER TABLE inventory_movements
ADD COLUMN currency varchar(3) DEFAULT 'NIS';

-- Add selling_price to products table
ALTER TABLE products
ADD COLUMN selling_price numeric DEFAULT 0 CHECK (selling_price >= 0);

-- Create a view to calculate inventory value (for dashboard analytics)
CREATE OR REPLACE VIEW inventory_value_summary AS
SELECT 
  p.id,
  p.name,
  p.category,
  p.current_stock,
  p.unit_type,
  p.selling_price,
  COALESCE(latest_cost.price_per_unit, 0) as cost_per_unit,
  p.current_stock * COALESCE(latest_cost.price_per_unit, 0) as inventory_value_cost,
  p.current_stock * COALESCE(p.selling_price, 0) as inventory_value_selling
FROM products p
LEFT JOIN LATERAL (
  SELECT DISTINCT price_per_unit
  FROM inventory_movements
  WHERE product_id = p.id AND type = 'IN' AND price_per_unit > 0
  ORDER BY date DESC
  LIMIT 1
) latest_cost ON true;

-- Create a view to calculate recipe production costs
CREATE OR REPLACE VIEW recipe_cost_summary AS
SELECT 
  pr.id as recipe_id,
  pr.finished_product_id,
  pr.raw_material_id,
  p_raw.name as raw_material_name,
  pr.required_quantity,
  pr.unit_type,
  COALESCE(latest_cost.price_per_unit, 0) as ingredient_cost_per_unit,
  pr.required_quantity * COALESCE(latest_cost.price_per_unit, 0) as ingredient_total_cost
FROM product_recipes pr
JOIN products p_raw ON pr.raw_material_id = p_raw.id
LEFT JOIN LATERAL (
  SELECT DISTINCT price_per_unit
  FROM inventory_movements
  WHERE product_id = pr.raw_material_id AND type = 'IN' AND price_per_unit > 0
  ORDER BY date DESC
  LIMIT 1
) latest_cost ON true;

-- Verification
SELECT COUNT(*) as inventory_movements_count FROM inventory_movements;
SELECT COUNT(*) as products_count FROM products;
SELECT COUNT(*) as recipes_count FROM product_recipes;
