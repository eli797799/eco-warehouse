-- Enable Realtime for inventory and inventory_movements tables

-- Drop existing publication if exists
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create publication with the tables we want to track
CREATE PUBLICATION supabase_realtime FOR TABLE items, inventory_movements;

-- Alternative: If you want to enable Realtime for all tables
-- CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- Grant necessary permissions
GRANT SELECT ON items TO anon, authenticated;
GRANT SELECT ON inventory_movements TO anon, authenticated;
