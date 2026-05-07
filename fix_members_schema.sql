-- Allow NULL card_number for pending members
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_card_number_key;
ALTER TABLE members ADD CONSTRAINT members_card_number_unique UNIQUE (card_number) WHERE card_number IS NOT NULL;

-- Add status column values if not exists
ALTER TABLE members ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
