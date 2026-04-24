-- Add serial column to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS serial INTEGER DEFAULT 999;
