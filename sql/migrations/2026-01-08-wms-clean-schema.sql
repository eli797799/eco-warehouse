-- Migration: Clean Warehouse Management System (WMS) Schema
-- Date: 2026-01-08
-- Scope: Simple, pure inventory tracking for Eco Cuplate

-- ===== DROP OLD TABLES (if exists) =====
DROP TABLE IF EXISTS waste_tracking CASCADE;
DROP TABLE IF EXISTS production_runs CASCADE;
DROP TABLE IF EXISTS product_recipes CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;

-- ===== CREATE FRESH ITEMS TABLE =====
CREATE TABLE items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL UNIQUE,
  unit_type varchar(50) NOT NULL DEFAULT 'units' CHECK (unit_type IN ('kg', 'liters', 'units', 'meters', 'pieces')),
  min_stock numeric NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_items_name ON items(name);

-- ===== CREATE INVENTORY_MOVEMENTS TABLE =====
CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity numeric NOT NULL CHECK (quantity != 0),
  movement_type varchar(10) NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
  notes text,
  date timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_movements_item ON inventory_movements(item_id);
CREATE INDEX idx_movements_date ON inventory_movements(date);
CREATE INDEX idx_movements_type ON inventory_movements(movement_type);

-- ===== CREATE VIEW: CURRENT STOCK (calculated from movements) =====
CREATE OR REPLACE VIEW current_stock_view AS
SELECT 
  i.id,
  i.name,
  i.unit_type,
  i.min_stock,
  COALESCE(SUM(CASE 
    WHEN m.movement_type = 'IN' THEN m.quantity 
    WHEN m.movement_type = 'OUT' THEN -m.quantity 
    ELSE 0 
  END), 0) as current_stock,
  i.created_at
FROM items i
LEFT JOIN inventory_movements m ON i.id = m.item_id
GROUP BY i.id, i.name, i.unit_type, i.min_stock, i.created_at;

-- ===== CREATE VIEW: LOW STOCK ALERTS =====
CREATE OR REPLACE VIEW low_stock_alerts AS
SELECT 
  id,
  name,
  unit_type,
  min_stock,
  current_stock,
  (min_stock - current_stock) as deficit
FROM current_stock_view
WHERE current_stock <= min_stock
ORDER BY deficit DESC;

-- ===== CREATE VIEW: TODAY'S MOVEMENTS =====
CREATE OR REPLACE VIEW todays_movements AS
SELECT 
  m.id,
  i.name,
  i.unit_type,
  m.quantity,
  m.movement_type,
  m.notes,
  m.date
FROM inventory_movements m
JOIN items i ON m.item_id = i.id
WHERE DATE(m.date) = CURRENT_DATE
ORDER BY m.date DESC;

-- ===== ENABLE RLS =====
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES: PUBLIC ACCESS (for now) =====
CREATE POLICY "Items: Public access" ON items FOR ALL USING (true);
CREATE POLICY "Movements: Public access" ON inventory_movements FOR ALL USING (true);

-- ===== VERIFICATION =====
SELECT 'WMS Schema created successfully' as status;
SELECT COUNT(*) as items_count FROM items;
SELECT COUNT(*) as movements_count FROM inventory_movements;
