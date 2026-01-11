-- Add barcode, SKU, package quantity, and expiry date support
-- Run this in Supabase SQL Editor

-- 1. Add new columns to items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS package_quantity INTEGER;

-- 2. Add unique constraints for barcode and SKU (optional but recommended)
CREATE UNIQUE INDEX IF NOT EXISTS items_barcode_unique ON items(barcode) WHERE barcode IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS items_sku_unique ON items(sku) WHERE sku IS NOT NULL;

-- 3. Add expiry date to inventory_movements table
ALTER TABLE inventory_movements
ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- 4. Create a view for expiring items (items expiring in the next 30 days)
CREATE OR REPLACE VIEW expiring_items AS
SELECT 
  im.id,
  im.item_id,
  i.name,
  i.unit_type,
  im.quantity,
  im.expiry_date,
  (im.expiry_date - CURRENT_DATE) AS days_until_expiry,
  CASE 
    WHEN im.expiry_date < CURRENT_DATE THEN 'expired'
    WHEN im.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
    WHEN im.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
    ELSE 'ok'
  END AS expiry_status
FROM inventory_movements im
JOIN items i ON im.item_id = i.id
WHERE im.movement_type = 'in' 
  AND im.expiry_date IS NOT NULL
  AND im.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY im.expiry_date ASC;

-- 5. Grant permissions
GRANT SELECT ON expiring_items TO anon, authenticated;

-- 6. Add comment for documentation
COMMENT ON COLUMN items.barcode IS 'Product barcode for scanning';
COMMENT ON COLUMN items.sku IS 'Stock Keeping Unit - unique product identifier';
COMMENT ON COLUMN items.package_quantity IS 'Number of units per package';
COMMENT ON COLUMN inventory_movements.expiry_date IS 'Expiry date for this batch (for IN movements)';
