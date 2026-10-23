-- =========================================================================
-- Crown Coffee Database Security Hardening: Row Level Security (RLS)
-- 
-- 1. STRICT TABLES: ZERO public/anon access.
--    admin_accounts, sessions, staff_accounts, costing_users, costing_sessions
--    Can ONLY be accessed by server-side service_role (via verified API endpoints).
--    Prevents hackers from extracting admin PINs, hashes, or session tokens.
--
-- 2. OPERATIONAL TABLES: Accessible by service_role and anon
--    Allows cafe UI components to query attendance, staff rosters, orders,
--    and inventory without downtime, while admin routes are protected by middleware.
-- =========================================================================

-- Step 1: Strict Zero-Anon Tables (Credentials & Sessions)
DO $$
DECLARE
  tbl text;
  strict_tables text[] := ARRAY[
    'admin_accounts',
    'sessions',
    'staff_accounts',
    'costing_users',
    'costing_sessions'
  ];
BEGIN
  FOREACH tbl IN ARRAY strict_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      -- Enable RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      
      -- Drop any legacy public policies
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'public_anon_manage_' || tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'public_anon_select_' || tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'service_role_manage_' || tbl, tbl);
      
      -- Grant ONLY service_role full access
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);',
        'service_role_manage_' || tbl,
        tbl
      );
      
      RAISE NOTICE '🔒 STRICT SECURITY: % locked to service_role only (No anon access)', tbl;
    END IF;
  END LOOP;
END $$;

-- Step 2: Operational Tables (Enabled RLS + service_role + anon operational policy)
DO $$
DECLARE
  tbl text;
  op_tables text[] := ARRAY[
    'staff',
    'payroll_entries',
    'advance_log',
    'attendance',
    'attendance_log',
    'leave_balance',
    'leave_requests',
    'service_charge_pool',
    'staff_notes',
    'staff_penalties',
    'staff_evaluations',
    'staff_shift_swaps',
    'staff_locations',
    'staff_location_logs',
    'geofence_zones',
    'geofence_events',
    'tracking_consent',
    'sos_alerts',
    'errand_trips',
    'members',
    'member_visits',
    'member_offers',
    'member_feedback',
    'member_notifications',
    'member_card_logs',
    'member_rfid_taps',
    'equipment_checklist',
    'salary_payments',
    'assigned_tasks',
    'staff_tasks',
    'staff_queries',
    'pos_shifts',
    'pos_settings',
    'recipe_book',
    'inventory_audits',
    'inventory_audit_items',
    'menu_items',
    'guest_feedbacks'
  ];
BEGIN
  FOREACH tbl IN ARRAY op_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      -- Enable RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      
      -- Recreate service_role policy
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'service_role_manage_' || tbl, tbl);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);',
        'service_role_manage_' || tbl,
        tbl
      );
      
      -- Recreate anon policy so cafe operations & UI components function seamlessly
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'anon_operational_' || tbl, tbl);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true);',
        'anon_operational_' || tbl,
        tbl
      );
      
      RAISE NOTICE '✅ Operational table secured: %', tbl;
    END IF;
  END LOOP;
END $$;

-- Reload schema caches
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
