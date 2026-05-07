CREATE TABLE IF NOT EXISTS staff_remarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES admin_accounts(id),
  remark_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  created_by_name TEXT DEFAULT 'Admin'
);

ALTER TABLE staff_remarks DISABLE ROW LEVEL SECURITY;
