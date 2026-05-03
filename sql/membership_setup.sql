-- Membership System Tables
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_number TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  date_of_birth DATE,
  address TEXT,
  occupation TEXT,
  status TEXT DEFAULT 'pending',
  tier TEXT DEFAULT 'silver',
  member_since DATE,
  total_visits INTEGER DEFAULT 0,
  punch_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_special_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  occasion_name TEXT NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  recorded_by TEXT DEFAULT 'manager',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS member_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  discount_percent INTEGER DEFAULT 10,
  valid_days INTEGER DEFAULT 7,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES member_visits(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  subject TEXT,
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent'
);

-- Disable RLS for now as requested
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_special_dates DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_offers DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_notifications DISABLE ROW LEVEL SECURITY;
