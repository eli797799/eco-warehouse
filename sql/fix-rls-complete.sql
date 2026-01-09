-- Complete RLS fix script for all tables
-- Run this in Supabase SQL Editor if you get "Supabase error: {}" messages

-- ============================================
-- 1. DISABLE RLS TEMPORARILY FOR SETUP
-- ============================================
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_docs DISABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE waste_logs DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. VERIFY SCHEMA - Ensure category column exists
-- ============================================
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';

-- Create index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- ============================================
-- 3. RE-ENABLE RLS
-- ============================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. PRODUCTS TABLE - DROP OLD POLICIES
-- ============================================
DROP POLICY IF EXISTS "products_public_read" ON products;
DROP POLICY IF EXISTS "products_public_insert" ON products;
DROP POLICY IF EXISTS "products_public_update" ON products;
DROP POLICY IF EXISTS "products_public_delete" ON products;
DROP POLICY IF EXISTS "Allow public read" ON products;
DROP POLICY IF EXISTS "Allow public insert" ON products;
DROP POLICY IF EXISTS "Allow public update" ON products;
DROP POLICY IF EXISTS "Allow public delete" ON products;

-- ============================================
-- 5. PRODUCTS TABLE - CREATE NEW ALLOW ALL POLICIES
-- ============================================
CREATE POLICY "products_allow_all_read"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "products_allow_all_insert"
  ON products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "products_allow_all_update"
  ON products FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "products_allow_all_delete"
  ON products FOR DELETE
  USING (true);

-- ============================================
-- 6. MOVEMENTS TABLE - DROP OLD POLICIES
-- ============================================
DROP POLICY IF EXISTS "movements_public_read" ON movements;
DROP POLICY IF EXISTS "movements_public_insert" ON movements;
DROP POLICY IF EXISTS "movements_public_update" ON movements;
DROP POLICY IF EXISTS "Allow public read" ON movements;
DROP POLICY IF EXISTS "Allow public insert" ON movements;
DROP POLICY IF EXISTS "Allow public update" ON movements;

-- ============================================
-- 7. MOVEMENTS TABLE - CREATE NEW ALLOW ALL POLICIES
-- ============================================
CREATE POLICY "movements_allow_all_read"
  ON movements FOR SELECT
  USING (true);

CREATE POLICY "movements_allow_all_insert"
  ON movements FOR INSERT
  WITH CHECK (true);

CREATE POLICY "movements_allow_all_update"
  ON movements FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "movements_allow_all_delete"
  ON movements FOR DELETE
  USING (true);

-- ============================================
-- 8. RECIPES TABLE - DROP OLD POLICIES
-- ============================================
DROP POLICY IF EXISTS "recipes_public_read" ON recipes;
DROP POLICY IF EXISTS "recipes_public_insert" ON recipes;
DROP POLICY IF EXISTS "recipes_public_update" ON recipes;
DROP POLICY IF EXISTS "Allow public read" ON recipes;
DROP POLICY IF EXISTS "Allow public insert" ON recipes;
DROP POLICY IF EXISTS "Allow public update" ON recipes;

-- ============================================
-- 9. RECIPES TABLE - CREATE NEW ALLOW ALL POLICIES
-- ============================================
CREATE POLICY "recipes_allow_all_read"
  ON recipes FOR SELECT
  USING (true);

CREATE POLICY "recipes_allow_all_insert"
  ON recipes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "recipes_allow_all_update"
  ON recipes FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "recipes_allow_all_delete"
  ON recipes FOR DELETE
  USING (true);

-- ============================================
-- 10. SHIPPING_DOCS TABLE - DROP OLD POLICIES
-- ============================================
DROP POLICY IF EXISTS "shipping_docs_public_read" ON shipping_docs;
DROP POLICY IF EXISTS "shipping_docs_public_insert" ON shipping_docs;
DROP POLICY IF EXISTS "shipping_docs_public_update" ON shipping_docs;
DROP POLICY IF EXISTS "Allow public read" ON shipping_docs;
DROP POLICY IF EXISTS "Allow public insert" ON shipping_docs;
DROP POLICY IF EXISTS "Allow public update" ON shipping_docs;

-- ============================================
-- 11. SHIPPING_DOCS TABLE - CREATE NEW ALLOW ALL POLICIES
-- ============================================
CREATE POLICY "shipping_docs_allow_all_read"
  ON shipping_docs FOR SELECT
  USING (true);

CREATE POLICY "shipping_docs_allow_all_insert"
  ON shipping_docs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "shipping_docs_allow_all_update"
  ON shipping_docs FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 12. SHIPPING_ITEMS TABLE - DROP OLD POLICIES
-- ============================================
DROP POLICY IF EXISTS "shipping_items_public_read" ON shipping_items;
DROP POLICY IF EXISTS "shipping_items_public_insert" ON shipping_items;
DROP POLICY IF EXISTS "shipping_items_public_update" ON shipping_items;
DROP POLICY IF EXISTS "Allow public read" ON shipping_items;
DROP POLICY IF EXISTS "Allow public insert" ON shipping_items;
DROP POLICY IF EXISTS "Allow public update" ON shipping_items;

-- ============================================
-- 13. SHIPPING_ITEMS TABLE - CREATE NEW ALLOW ALL POLICIES
-- ============================================
CREATE POLICY "shipping_items_allow_all_read"
  ON shipping_items FOR SELECT
  USING (true);

CREATE POLICY "shipping_items_allow_all_insert"
  ON shipping_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "shipping_items_allow_all_update"
  ON shipping_items FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 14. PRODUCTION_RUNS TABLE - DROP OLD POLICIES
-- ============================================
DROP POLICY IF EXISTS "production_runs_public_read" ON production_runs;
DROP POLICY IF EXISTS "production_runs_public_insert" ON production_runs;
DROP POLICY IF EXISTS "production_runs_public_update" ON production_runs;
DROP POLICY IF EXISTS "Allow public read" ON production_runs;
DROP POLICY IF EXISTS "Allow public insert" ON production_runs;
DROP POLICY IF EXISTS "Allow public update" ON production_runs;

-- ============================================
-- 15. PRODUCTION_RUNS TABLE - CREATE NEW ALLOW ALL POLICIES
-- ============================================
CREATE POLICY "production_runs_allow_all_read"
  ON production_runs FOR SELECT
  USING (true);

CREATE POLICY "production_runs_allow_all_insert"
  ON production_runs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "production_runs_allow_all_update"
  ON production_runs FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 16. WASTE_LOGS TABLE - DROP OLD POLICIES
-- ============================================
DROP POLICY IF EXISTS "waste_logs_public_read" ON waste_logs;
DROP POLICY IF EXISTS "waste_logs_public_insert" ON waste_logs;
DROP POLICY IF EXISTS "waste_logs_public_update" ON waste_logs;
DROP POLICY IF EXISTS "Allow public read" ON waste_logs;
DROP POLICY IF EXISTS "Allow public insert" ON waste_logs;
DROP POLICY IF EXISTS "Allow public update" ON waste_logs;

-- ============================================
-- 17. WASTE_LOGS TABLE - CREATE NEW ALLOW ALL POLICIES
-- ============================================
CREATE POLICY "waste_logs_allow_all_read"
  ON waste_logs FOR SELECT
  USING (true);

CREATE POLICY "waste_logs_allow_all_insert"
  ON waste_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "waste_logs_allow_all_update"
  ON waste_logs FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 18. VERIFY DATA INTEGRITY
-- ============================================
-- Make sure all products have a category
UPDATE products SET category = 'raw_material' WHERE category IS NULL OR category = 'general';

-- Verify the tables are accessible
SELECT COUNT(*) as products_count FROM products;
SELECT COUNT(*) as movements_count FROM movements;
SELECT COUNT(*) as recipes_count FROM recipes;

-- Done! Your RLS policies are now fixed
