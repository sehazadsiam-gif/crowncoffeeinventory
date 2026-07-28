-- SQL Schema for Feature Flags / System Settings
-- Can be run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access for feature flags
CREATE POLICY "Allow public read system_settings" ON public.system_settings
    FOR SELECT USING (true);

-- Allow public insert/update access
CREATE POLICY "Allow public insert system_settings" ON public.system_settings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update system_settings" ON public.system_settings
    FOR UPDATE USING (true);

-- Seed default feature flags (all enabled by default)
INSERT INTO public.system_settings (key, value)
VALUES (
    'feature_flags',
    '{
        "inventory_manager": true,
        "stock_import": true,
        "stock_audit": true,
        "menu_list": true,
        "menu_import": true,
        "menu_engineering": true,
        "recipebook": true,
        "bazar": true,
        "balance_sheet": true,
        "waste": true,
        "sales_audit": true,
        "feedbacks": true,
        "checklist": true,
        "staff_directory": true,
        "attendance_live": true,
        "attendance_public": true,
        "attendance_reports": true,
        "leave_requests": true,
        "payroll": true,
        "advances": true,
        "service_charge": true,
        "tasks": true,
        "overtime": true,
        "members": true,
        "pos": true
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
