-- ========================================================
-- LIVE TRACKING, GEOFENCING & EMERGENCY SOS SCHEMA
-- Run in Supabase SQL Editor
-- ========================================================

-- Ensure staff_accounts has mobile_number for compatibility
ALTER TABLE public.staff_accounts ADD COLUMN IF NOT EXISTS mobile_number TEXT;

-- 1. Staff Live Locations Table (Current live state)
CREATE TABLE IF NOT EXISTS public.staff_locations (
  staff_id UUID PRIMARY KEY REFERENCES public.staff(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION DEFAULT 0,
  heading DOUBLE PRECISION,
  altitude DOUBLE PRECISION,
  battery_level INT,
  is_charging BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT true,
  tracking_mode TEXT DEFAULT 'foreground',
  motion_mode TEXT DEFAULT 'stationary',
  address_hint TEXT,
  is_inside_geofence BOOLEAN DEFAULT false,
  last_ping TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'browser'
);

ALTER TABLE public.staff_locations ADD COLUMN IF NOT EXISTS altitude DOUBLE PRECISION;
ALTER TABLE public.staff_locations ADD COLUMN IF NOT EXISTS tracking_mode TEXT DEFAULT 'foreground';
ALTER TABLE public.staff_locations ADD COLUMN IF NOT EXISTS address_hint TEXT;
ALTER TABLE public.staff_locations ADD COLUMN IF NOT EXISTS is_inside_geofence BOOLEAN DEFAULT false;
ALTER TABLE public.staff_locations ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_staff_locations_last_ping ON public.staff_locations (last_ping DESC);

-- 2. Staff Location Logs Table (Breadcrumb trail / history)
CREATE TABLE IF NOT EXISTS public.staff_location_logs (
  id BIGSERIAL PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  battery_level INT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loc_logs_staff_date ON public.staff_location_logs (staff_id, recorded_at DESC);

-- 3. Geofence Zones Table
CREATE TABLE IF NOT EXISTS public.geofence_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_m INT NOT NULL DEFAULT 100,
  zone_type TEXT DEFAULT 'workplace',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Geofence Events Table
CREATE TABLE IF NOT EXISTS public.geofence_events (
  id BIGSERIAL PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES public.geofence_zones(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofence_events_staff ON public.geofence_events (staff_id, recorded_at DESC);

-- 5. Tracking Consent Table
CREATE TABLE IF NOT EXISTS public.tracking_consent (
  staff_id UUID PRIMARY KEY REFERENCES public.staff(id) ON DELETE CASCADE,
  consented BOOLEAN DEFAULT false,
  consented_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address TEXT,
  device_info TEXT
);

-- 6. Insert Default Crown Coffee Workplace Geofence
INSERT INTO public.geofence_zones (name, latitude, longitude, radius_m, zone_type)
SELECT 'Crown Coffee Main', 23.8759, 90.3795, 120, 'workplace'
WHERE NOT EXISTS (SELECT 1 FROM public.geofence_zones WHERE name = 'Crown Coffee Main');

-- 7. SOS Alerts Table
CREATE TABLE IF NOT EXISTS public.sos_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  battery_level INT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON public.sos_alerts (status, created_at DESC);

-- 8. Errand Trips Table
CREATE TABLE IF NOT EXISTS public.errand_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  purpose TEXT,
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  departure_time TIMESTAMPTZ DEFAULT NOW(),
  return_time TIMESTAMPTZ,
  distance_km NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'in_progress',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_errand_trips_staff ON public.errand_trips (staff_id, departure_time DESC);

-- 9. Disable RLS and Grant Permissions
ALTER TABLE public.staff_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_location_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_zones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_consent DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.errand_trips DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- 10. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
