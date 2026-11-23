import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// SQL to create all practice_ tables
const SETUP_SQL = `
-- practice_items
CREATE TABLE IF NOT EXISTS practice_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  barcode     text NOT NULL UNIQUE,
  base_unit   text NOT NULL CHECK (base_unit IN ('g','ml','pcs')),
  pack_size   integer NOT NULL DEFAULT 1,
  par_level   integer NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- practice_bazar_trips
CREATE TABLE IF NOT EXISTS practice_bazar_trips (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','approved')),
  total_paid      numeric(12,2),
  approved_by     text,
  approved_at     timestamptz,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- practice_bazar_lines
CREATE TABLE IF NOT EXISTS practice_bazar_lines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid NOT NULL REFERENCES practice_bazar_trips(id) ON DELETE CASCADE,
  item_id     uuid NOT NULL REFERENCES practice_items(id),
  quantity    integer NOT NULL DEFAULT 0,
  scanned_by  text,
  scanned_at  timestamptz NOT NULL DEFAULT now()
);

-- practice_stock_movements
CREATE TABLE IF NOT EXISTS practice_stock_movements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         uuid NOT NULL REFERENCES practice_items(id),
  movement_type   text NOT NULL CHECK (movement_type IN ('purchase','usage','reversal')),
  quantity        integer NOT NULL,
  trip_id         uuid REFERENCES practice_bazar_trips(id),
  reason          text,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
`

export async function POST(req) {
  try {
    // Execute DDL via raw SQL using pg through Supabase rpc if available,
    // otherwise use the REST API's rpc endpoint.
    // We use supabase.rpc to call a helper, or fall back to direct pg.
    // Since Supabase JS client does not expose raw DDL, we use the pg lib.
    const { Client } = await import('pg')
    const client = new Client({
      connectionString: process.env.DATABASE_URL || buildConnectionString(),
    })
    await client.connect()
    await client.query(SETUP_SQL)
    await client.end()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Practice setup error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function buildConnectionString() {
  // Extract host from supabase URL: https://supabase.ccadmin.online → supabase.ccadmin.online
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const host = url.replace(/^https?:\/\//, '')
  return `postgresql://postgres.${host}:5432/postgres`
}
