-- ============================================
-- SQL SCRIPT: FACTORY RESET (CAUTION!)
-- This will delete ALL entries and start fresh.
-- Run this in Supabase SQL Editor.
-- ============================================

-- Delete in order to respect Foreign Key constraints
TRUNCATE TABLE stock_movements CASCADE;
TRUNCATE TABLE sales CASCADE;
TRUNCATE TABLE bazar_entries CASCADE;
TRUNCATE TABLE recipes CASCADE;
TRUNCATE TABLE menu_items CASCADE;
TRUNCATE TABLE ingredients CASCADE;

-- Optional: Restart ID sequences if they were serial (not needed for UUIDs but good practice)
-- ALTER SEQUENCE table_name_id_seq RESTART WITH 1;

COMMIT;
