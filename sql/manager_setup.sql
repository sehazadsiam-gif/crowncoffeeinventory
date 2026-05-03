-- Manager Auth Setup
-- Run this in Supabase SQL Editor

-- 1. Add role column to admin_accounts if not exists
ALTER TABLE admin_accounts
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';

-- 2. Insert or update manager account
-- Replace HASH_HERE with: $2b$10$uzZgKsy32QpUrHwwcFEfYuOcqdb0/VNToPftNoh4JXBWeITBloXOe
INSERT INTO admin_accounts (username, password_hash, role)
VALUES ('cc', '$2b$10$uzZgKsy32QpUrHwwcFEfYuOcqdb0/VNToPftNoh4JXBWeITBloXOe', 'manager')
ON CONFLICT (username) DO UPDATE SET role='manager';
