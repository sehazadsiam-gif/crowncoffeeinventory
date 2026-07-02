-- Create Guest Feedbacks Table
CREATE TABLE IF NOT EXISTS guest_feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  highlights TEXT[] DEFAULT '{}', -- E.g. array containing 'food', 'service', 'value_for_money'
  suggestion TEXT,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security as per the app conventions (all tables are disabled RLS or handled via standard public key)
ALTER TABLE guest_feedbacks DISABLE ROW LEVEL SECURITY;
