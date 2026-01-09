-- Ensure category column exists and fix schema issues
-- This migration should be run after supabase-schema.sql

-- Verify and add category column if missing
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';

-- Add index on category for faster queries
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Verify RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for products with proper names
DROP POLICY IF EXISTS "products_public_read" ON products;
DROP POLICY IF EXISTS "products_public_insert" ON products;
DROP POLICY IF EXISTS "products_public_update" ON products;
DROP POLICY IF EXISTS "products_public_delete" ON products;

CREATE POLICY "products_public_read"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "products_public_insert"
  ON products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "products_public_update"
  ON products FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "products_public_delete"
  ON products FOR DELETE
  USING (true);

-- Fix movements policies
DROP POLICY IF EXISTS "movements_public_read" ON movements;
DROP POLICY IF EXISTS "movements_public_insert" ON movements;
DROP POLICY IF EXISTS "movements_public_update" ON movements;

CREATE POLICY "movements_public_read"
  ON movements FOR SELECT
  USING (true);

CREATE POLICY "movements_public_insert"
  ON movements FOR INSERT
  WITH CHECK (true);

CREATE POLICY "movements_public_update"
  ON movements FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Fix recipes policies
DROP POLICY IF EXISTS "recipes_public_read" ON recipes;
DROP POLICY IF EXISTS "recipes_public_insert" ON recipes;
DROP POLICY IF EXISTS "recipes_public_update" ON recipes;

CREATE POLICY "recipes_public_read"
  ON recipes FOR SELECT
  USING (true);

CREATE POLICY "recipes_public_insert"
  ON recipes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "recipes_public_update"
  ON recipes FOR UPDATE
  USING (true)
  WITH CHECK (true);
