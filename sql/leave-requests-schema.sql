-- ============================================
-- LEAVE REQUEST SYSTEM SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL, -- 'sick', 'casual', 'annual', 'unpaid'
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for ease of operations in dev
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
