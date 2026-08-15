-- ============================================
-- PERFORMANCE EVALUATIONS & SHIFT SWAPS SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Table for Admin Manual Evaluation Scores (0-100 pts) and Comments
CREATE TABLE IF NOT EXISTS staff_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  month INT NOT NULL,
  year INT NOT NULL,
  admin_score NUMERIC NOT NULL DEFAULT 100,
  admin_comments TEXT,
  awarded_bonus NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, month, year)
);

-- Table for Staff Shift Swap Requests
CREATE TABLE IF NOT EXISTS staff_shift_swaps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  requester_date DATE NOT NULL,
  target_staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  target_date DATE,
  reason TEXT,
  status VARCHAR(30) DEFAULT 'pending_peer', -- 'pending_peer', 'pending_admin', 'approved', 'rejected'
  peer_response_at TIMESTAMPTZ,
  admin_response_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for compatibility
ALTER TABLE staff_evaluations DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shift_swaps DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_staff_evaluations_staff_month ON staff_evaluations(staff_id, month, year);
CREATE INDEX IF NOT EXISTS idx_staff_shift_swaps_requester ON staff_shift_swaps(requester_id);
CREATE INDEX IF NOT EXISTS idx_staff_shift_swaps_target ON staff_shift_swaps(target_staff_id);
