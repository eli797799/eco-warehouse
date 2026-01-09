-- Fix for RLS and ensure category column exists and is accessible

-- First, let's verify the products table structure
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read" ON products;
DROP POLICY IF EXISTS "Allow public insert" ON products;
DROP POLICY IF EXISTS "Allow public update" ON products;
DROP POLICY IF EXISTS "Allow public delete" ON products;

-- Create new policies to allow all operations
CREATE POLICY "Allow public read"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert"
  ON products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update"
  ON products FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete"
  ON products FOR DELETE
  USING (true);

-- Enable RLS on movements table
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read" ON movements;
DROP POLICY IF EXISTS "Allow public insert" ON movements;
DROP POLICY IF EXISTS "Allow public update" ON movements;

-- Create new policies to allow all operations
CREATE POLICY "Allow public read"
  ON movements FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert"
  ON movements FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update"
  ON movements FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Enable RLS on other tables
ALTER TABLE shipping_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;

-- Add policies to all other tables
CREATE POLICY "Allow public read"
  ON shipping_docs FOR SELECT
  USING (true);
CREATE POLICY "Allow public insert"
  ON shipping_docs FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Allow public update"
  ON shipping_docs FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read"
  ON shipping_items FOR SELECT
  USING (true);
CREATE POLICY "Allow public insert"
  ON shipping_items FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Allow public update"
  ON shipping_items FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read"
  ON recipes FOR SELECT
  USING (true);
CREATE POLICY "Allow public insert"
  ON recipes FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Allow public update"
  ON recipes FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read"
  ON production_runs FOR SELECT
  USING (true);
CREATE POLICY "Allow public insert"
  ON production_runs FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Allow public update"
  ON production_runs FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read"
  ON waste_logs FOR SELECT
  USING (true);
CREATE POLICY "Allow public insert"
  ON waste_logs FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Allow public update"
  ON waste_logs FOR UPDATE
  USING (true)
  WITH CHECK (true);
