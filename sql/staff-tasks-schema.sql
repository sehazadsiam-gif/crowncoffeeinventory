-- Run this in Supabase SQL Editor
-- Staff Tasks Table for To-Do assignment from admin to staff

CREATE TABLE IF NOT EXISTS staff_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal')),
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'not_done')),
  staff_note TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE staff_tasks ENABLE ROW LEVEL SECURITY;

-- Allow all operations (admin controls access via application logic)
DROP POLICY IF EXISTS "Allow all select staff_tasks" ON staff_tasks;
DROP POLICY IF EXISTS "Allow all insert staff_tasks" ON staff_tasks;
DROP POLICY IF EXISTS "Allow all update staff_tasks" ON staff_tasks;
DROP POLICY IF EXISTS "Allow all delete staff_tasks" ON staff_tasks;

CREATE POLICY "Allow all select staff_tasks" ON staff_tasks FOR SELECT USING (true);
CREATE POLICY "Allow all insert staff_tasks" ON staff_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update staff_tasks" ON staff_tasks FOR UPDATE USING (true);
CREATE POLICY "Allow all delete staff_tasks" ON staff_tasks FOR DELETE USING (true);

-- Optional: Create an index for faster staff lookups
CREATE INDEX IF NOT EXISTS idx_staff_tasks_staff_id ON staff_tasks (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON staff_tasks (status);
