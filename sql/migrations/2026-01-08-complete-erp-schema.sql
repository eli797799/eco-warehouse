-- Migration: Complete ERP Schema for Manufacturing Warehouse Management
-- Date: 2026-01-08
-- Scope: Full inventory, production, waste tracking system with user roles

-- ===== 1. ENHANCED PRODUCTS TABLE =====
ALTER TABLE products
ADD COLUMN IF NOT EXISTS unit_type varchar(20) DEFAULT 'kg' CHECK (unit_type IN ('kg', 'liters', 'units', 'meters', 'pieces'));

ALTER TABLE products
ADD COLUMN IF NOT EXISTS selling_price numeric DEFAULT 0 CHECK (selling_price >= 0);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS cost_per_unit numeric DEFAULT 0 CHECK (cost_per_unit >= 0);

-- ===== 2. ENHANCED INVENTORY_MOVEMENTS TABLE =====
ALTER TABLE inventory_movements
ADD COLUMN IF NOT EXISTS price_per_unit numeric DEFAULT 0 CHECK (price_per_unit >= 0);

ALTER TABLE inventory_movements
ADD COLUMN IF NOT EXISTS currency varchar(3) DEFAULT 'NIS';

ALTER TABLE inventory_movements
ADD COLUMN IF NOT EXISTS unit_type varchar(20) DEFAULT 'kg';

ALTER TABLE inventory_movements
ADD COLUMN IF NOT EXISTS production_run_id uuid REFERENCES production_runs(id) ON DELETE SET NULL;

-- ===== 3. ENHANCED PRODUCT_RECIPES (BOM) TABLE =====
ALTER TABLE product_recipes
ADD COLUMN IF NOT EXISTS unit_type varchar(20) DEFAULT 'kg';

-- ===== 4. PRODUCTION_RUNS TABLE (New) =====
CREATE TABLE IF NOT EXISTS production_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finished_product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  actual_quantity_produced numeric NOT NULL DEFAULT 0 CHECK (actual_quantity_produced >= 0),
  shift varchar(50),
  production_date date NOT NULL DEFAULT CURRENT_DATE,
  produced_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_runs_product ON production_runs(finished_product_id);
CREATE INDEX IF NOT EXISTS idx_production_runs_date ON production_runs(production_date);

-- ===== 5. WASTE_TRACKING TABLE (Enhanced) =====
CREATE TABLE IF NOT EXISTS waste_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_run_id uuid REFERENCES production_runs(id) ON DELETE CASCADE,
  raw_material_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  expected_quantity numeric NOT NULL CHECK (expected_quantity >= 0),
  actual_quantity_used numeric NOT NULL CHECK (actual_quantity_used >= 0),
  waste_quantity numeric GENERATED ALWAYS AS (actual_quantity_used - expected_quantity) STORED,
  waste_percentage numeric GENERATED ALWAYS AS (
    CASE WHEN expected_quantity > 0 
    THEN ((actual_quantity_used - expected_quantity) / expected_quantity * 100)
    ELSE 0 END
  ) STORED,
  unit_type varchar(20) DEFAULT 'kg',
  notes text,
  recorded_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waste_tracking_production ON waste_tracking(production_run_id);
CREATE INDEX IF NOT EXISTS idx_waste_tracking_material ON waste_tracking(raw_material_id);

-- ===== 6. USER_ROLES TABLE (for RLS) =====
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role varchar(50) NOT NULL CHECK (role IN ('admin', 'storekeeper', 'production', 'viewer')),
  assigned_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

-- ===== 7. VIEW: PRODUCTION COST SUMMARY =====
CREATE OR REPLACE VIEW production_cost_summary AS
SELECT 
  pr.id as recipe_id,
  pr.finished_product_id,
  pr.raw_material_id,
  p_raw.name as raw_material_name,
  pr.required_quantity,
  pr.unit_type,
  COALESCE(latest_cost.price_per_unit, p_raw.cost_per_unit, 0) as ingredient_cost_per_unit,
  pr.required_quantity * COALESCE(latest_cost.price_per_unit, p_raw.cost_per_unit, 0) as ingredient_total_cost
FROM product_recipes pr
JOIN products p_raw ON pr.raw_material_id = p_raw.id
LEFT JOIN LATERAL (
  SELECT DISTINCT price_per_unit
  FROM inventory_movements
  WHERE product_id = pr.raw_material_id AND type = 'IN' AND price_per_unit > 0
  ORDER BY date DESC
  LIMIT 1
) latest_cost ON true;

-- ===== 8. VIEW: WASTE ANALYSIS SUMMARY =====
CREATE OR REPLACE VIEW waste_analysis_summary AS
SELECT 
  DATE_TRUNC('day', wt.recorded_at)::date as waste_date,
  pr.finished_product_id,
  p_finished.name as product_name,
  wt.raw_material_id,
  p_raw.name as material_name,
  SUM(wt.waste_quantity) as total_waste_quantity,
  SUM(wt.waste_quantity) / NULLIF(SUM(wt.actual_quantity_used), 0) * 100 as avg_waste_percentage,
  COUNT(DISTINCT pr.id) as production_count
FROM waste_tracking wt
JOIN production_runs pr ON wt.production_run_id = pr.id
JOIN products p_finished ON pr.finished_product_id = p_finished.id
JOIN products p_raw ON wt.raw_material_id = p_raw.id
GROUP BY DATE_TRUNC('day', wt.recorded_at), pr.finished_product_id, p_finished.name, wt.raw_material_id, p_raw.name
ORDER BY waste_date DESC;

-- ===== 9. ENABLE RLS ON ALL TABLES =====
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- ===== 10. RLS POLICIES =====

-- PRODUCTS: Everyone reads, only admin writes
CREATE POLICY "Products: Public read" ON products FOR SELECT USING (true);
CREATE POLICY "Products: Admin write" ON products FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Products: Admin update" ON products FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Products: Admin delete" ON products FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- INVENTORY_MOVEMENTS: Admin + Storekeeper write, everyone reads
CREATE POLICY "Inventory_movements: Public read" ON inventory_movements FOR SELECT USING (true);
CREATE POLICY "Inventory_movements: Storekeeper insert" ON inventory_movements FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'storekeeper'))
);
CREATE POLICY "Inventory_movements: Storekeeper update" ON inventory_movements FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'storekeeper'))
);

-- PRODUCT_RECIPES: Admin write, everyone reads
CREATE POLICY "Product_recipes: Public read" ON product_recipes FOR SELECT USING (true);
CREATE POLICY "Product_recipes: Admin write" ON product_recipes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Product_recipes: Admin update" ON product_recipes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- PRODUCTION_RUNS: Production + Admin write, everyone reads
CREATE POLICY "Production_runs: Public read" ON production_runs FOR SELECT USING (true);
CREATE POLICY "Production_runs: Production insert" ON production_runs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'production'))
);
CREATE POLICY "Production_runs: Production update" ON production_runs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'production'))
);

-- WASTE_TRACKING: Production + Admin write, everyone reads
CREATE POLICY "Waste_tracking: Public read" ON waste_tracking FOR SELECT USING (true);
CREATE POLICY "Waste_tracking: Production insert" ON waste_tracking FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'production'))
);
CREATE POLICY "Waste_tracking: Production update" ON waste_tracking FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'production'))
);

-- USER_ROLES: Only admin manages
CREATE POLICY "User_roles: Admin only" ON user_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ===== 11. VERIFICATION QUERIES =====
SELECT COUNT(*) as products_count FROM products;
SELECT COUNT(*) as inventory_movements_count FROM inventory_movements;
SELECT COUNT(*) as production_runs_count FROM production_runs;
SELECT COUNT(*) as waste_tracking_count FROM waste_tracking;
SELECT COUNT(*) as user_roles_count FROM user_roles;
