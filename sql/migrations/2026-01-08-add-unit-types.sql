-- Migration: Add unit_type column to inventory_movements and product_recipes tables
-- Date: 2026-01-08

-- Add unit_type column to inventory_movements
ALTER TABLE inventory_movements
ADD COLUMN unit_type varchar(20) DEFAULT 'kg' CHECK (unit_type IN ('kg', 'liters', 'units', 'meters'));

-- Add unit_type column to product_recipes
ALTER TABLE product_recipes
ADD COLUMN unit_type varchar(20) DEFAULT 'kg' CHECK (unit_type IN ('kg', 'liters', 'units', 'meters'));

-- Update products table to include unit_type for raw materials
ALTER TABLE products
ADD COLUMN unit_type varchar(20) DEFAULT 'kg' CHECK (unit_type IN ('kg', 'liters', 'units', 'meters'));

-- Create a trigger to auto-copy unit_type from products to product_recipes when a recipe is inserted
CREATE OR REPLACE FUNCTION auto_set_recipe_unit_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unit_type IS NULL THEN
    SELECT unit_type INTO NEW.unit_type
    FROM products
    WHERE id = NEW.raw_material_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_recipe_unit_type ON product_recipes;
CREATE TRIGGER set_recipe_unit_type
BEFORE INSERT OR UPDATE ON product_recipes
FOR EACH ROW
EXECUTE FUNCTION auto_set_recipe_unit_type();

-- Verification
SELECT COUNT(*) as inventory_movements_count FROM inventory_movements;
SELECT COUNT(*) as product_recipes_count FROM product_recipes;
SELECT COUNT(*) as products_count FROM products;
