-- Fix Cascade Delete for items
-- This allows deleting items with related inventory_movements

-- Drop existing foreign key constraint
ALTER TABLE inventory_movements 
DROP CONSTRAINT IF EXISTS inventory_movements_item_id_fkey;

-- Add foreign key with CASCADE DELETE
ALTER TABLE inventory_movements
ADD CONSTRAINT inventory_movements_item_id_fkey 
FOREIGN KEY (item_id) 
REFERENCES items(id) 
ON DELETE CASCADE;

-- Verify the constraint
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'inventory_movements'
  AND kcu.column_name = 'item_id';
