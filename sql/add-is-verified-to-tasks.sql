-- Migration script to add is_verified column to staff_tasks table
-- Run this in Supabase SQL Editor:

ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
