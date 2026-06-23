-- Run this in your Supabase SQL Editor to safely add the missing column
-- and ensure the table and policies are set up correctly.

CREATE TABLE IF NOT EXISTS public.staff_queries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    staff_name TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    admin_reply TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safely add the column if the table already existed from the previous version
ALTER TABLE public.staff_queries ADD COLUMN IF NOT EXISTS admin_reply TEXT;

-- Set up Row Level Security (RLS)
ALTER TABLE public.staff_queries ENABLE ROW LEVEL SECURITY;

-- Safely create policies (ignoring if they already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'staff_queries' AND policyname = 'Enable insert for all users'
    ) THEN
        CREATE POLICY "Enable insert for all users" ON public.staff_queries FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'staff_queries' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.staff_queries FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'staff_queries' AND policyname = 'Enable update for all users'
    ) THEN
        CREATE POLICY "Enable update for all users" ON public.staff_queries FOR UPDATE USING (true);
    END IF;
END $$;
