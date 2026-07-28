-- MIGRATION: Member RFID & Credit-Card ID System Schema

-- 1. Extend members table with RFID card and visit punch columns
ALTER TABLE members ADD COLUMN IF NOT EXISTS rfid_code TEXT UNIQUE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS card_status TEXT DEFAULT 'active';
ALTER TABLE members ADD COLUMN IF NOT EXISTS card_issued_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE members ADD COLUMN IF NOT EXISTS card_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '36 months');
ALTER TABLE members ADD COLUMN IF NOT EXISTS visit_punch_count INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS free_coffee_rewards_available INTEGER DEFAULT 0;

-- 2. Create member_card_logs table for tracking card issuance, replacements, and status changes
CREATE TABLE IF NOT EXISTS member_card_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  card_number TEXT,
  rfid_code TEXT,
  action TEXT NOT NULL, -- 'issued', 'replaced', 'lost', 'expired', 'deactivated'
  reason TEXT,
  performed_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create member_rfid_taps table for logging tap events
CREATE TABLE IF NOT EXISTS member_rfid_taps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  rfid_code TEXT NOT NULL,
  tapped_at TIMESTAMPTZ DEFAULT NOW(),
  location TEXT DEFAULT 'Counter',
  visit_number INTEGER,
  reward_earned BOOLEAN DEFAULT FALSE
);

-- Disable RLS on new tables as per project policy
ALTER TABLE member_card_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_rfid_taps DISABLE ROW LEVEL SECURITY;
