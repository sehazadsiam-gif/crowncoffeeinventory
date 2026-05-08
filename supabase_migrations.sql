-- Add free coffee columns to members table
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS free_coffee_claimed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS free_coffee_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS free_coffee_claimed_at TIMESTAMPTZ;

-- Create free_coffee_claims table
CREATE TABLE IF NOT EXISTS free_coffee_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  claim_type VARCHAR(50) DEFAULT 'first_time',
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS on new table if needed
ALTER TABLE free_coffee_claims DISABLE ROW LEVEL SECURITY;
