-- Run this in your Supabase SQL Editor

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

-- Set up Row Level Security (RLS)
ALTER TABLE public.staff_queries ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert
CREATE POLICY "Enable insert for all users" ON public.staff_queries
    FOR INSERT WITH CHECK (true);

-- Allow reading all for admin dashboard and staff portal
CREATE POLICY "Enable read access for all users" ON public.staff_queries
    FOR SELECT USING (true);

-- Allow updates (like status change and admin_reply)
CREATE POLICY "Enable update for all users" ON public.staff_queries
    FOR UPDATE USING (true);
