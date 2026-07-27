-- SQL Schema for Recipe Book module
-- Can be run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.recipe_book (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    paragraph TEXT NOT NULL,
    image_url TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.recipe_book ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read recipe_book" ON public.recipe_book
    FOR SELECT USING (true);

-- Allow public insert access
CREATE POLICY "Allow public insert recipe_book" ON public.recipe_book
    FOR INSERT WITH CHECK (true);

-- Allow public update access
CREATE POLICY "Allow public update recipe_book" ON public.recipe_book
    FOR UPDATE USING (true);

-- Allow public delete access
CREATE POLICY "Allow public delete recipe_book" ON public.recipe_book
    FOR DELETE USING (true);

-- Index for sorting & searching
CREATE INDEX IF NOT EXISTS idx_recipe_book_category ON public.recipe_book (category);
CREATE INDEX IF NOT EXISTS idx_recipe_book_created_at ON public.recipe_book (created_at DESC);
