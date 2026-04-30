ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS check_in_time TEXT;
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS check_out_time TEXT;
