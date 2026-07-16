// Run this with: node scripts/run-costing-schema.js
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// We'll run each CREATE TABLE statement individually via RPC
// The service role key bypasses RLS so we can call postgres functions

const statements = [
  // 1. Users
  `CREATE TABLE IF NOT EXISTS costing_users (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('chef', 'admin')),
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 2. Sessions
  `CREATE TABLE IF NOT EXISTS costing_sessions (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID REFERENCES costing_users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,
    role       TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_costing_sessions_token ON costing_sessions(token)`,

  // 3. Menu Items
  `CREATE TABLE IF NOT EXISTS costing_menu_items (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name         TEXT NOT NULL UNIQUE,
    category     TEXT,
    is_active    BOOLEAN DEFAULT TRUE,
    current_cogs NUMERIC(12,4) DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 4. Ingredients
  `CREATE TABLE IF NOT EXISTS costing_ingredients (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 5. Item Ingredients
  `CREATE TABLE IF NOT EXISTS costing_item_ingredients (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    menu_item_id      UUID NOT NULL REFERENCES costing_menu_items(id) ON DELETE CASCADE,
    ingredient_id     UUID REFERENCES costing_ingredients(id),
    ingredient_name   TEXT NOT NULL,
    quantity          NUMERIC(12,4) NOT NULL,
    unit              TEXT NOT NULL CHECK (unit IN ('g','kg','L','ml','piece','bottle')),
    price             NUMERIC(12,4) NOT NULL,
    price_basis_unit  TEXT NOT NULL CHECK (price_basis_unit IN ('per g','per kg','per L','per ml','per piece','per bottle')),
    line_cost         NUMERIC(12,4),
    sort_order        INTEGER DEFAULT 0,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_cii_menu_item ON costing_item_ingredients(menu_item_id)`,

  // 6. COGS History
  `CREATE TABLE IF NOT EXISTS costing_cogs_history (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    menu_item_id UUID NOT NULL REFERENCES costing_menu_items(id) ON DELETE CASCADE,
    total_cogs   NUMERIC(12,4) NOT NULL,
    snapshot     JSONB,
    saved_by     UUID REFERENCES costing_users(id),
    created_at   TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_cogs_hist_item ON costing_cogs_history(menu_item_id, created_at DESC)`,

  // 7. Delivery Channels
  `CREATE TABLE IF NOT EXISTS costing_delivery_channels (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    is_active  BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 8. Item Pricing (dine-in)
  `CREATE TABLE IF NOT EXISTS costing_item_pricing (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    menu_item_id  UUID NOT NULL REFERENCES costing_menu_items(id) ON DELETE CASCADE UNIQUE,
    dine_in_price NUMERIC(12,2) DEFAULT 0,
    updated_at    TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 9. Channel Pricing
  `CREATE TABLE IF NOT EXISTS costing_item_channel_pricing (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    menu_item_id   UUID NOT NULL REFERENCES costing_menu_items(id) ON DELETE CASCADE,
    channel_id     UUID NOT NULL REFERENCES costing_delivery_channels(id) ON DELETE CASCADE,
    selling_price  NUMERIC(12,2) DEFAULT 0,
    commission_pct NUMERIC(5,2) DEFAULT 0,
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(menu_item_id, channel_id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_cicp_item ON costing_item_channel_pricing(menu_item_id)`,

  // 10. Monthly Sales
  `CREATE TABLE IF NOT EXISTS costing_sales_monthly (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    menu_item_id  UUID NOT NULL REFERENCES costing_menu_items(id) ON DELETE CASCADE,
    year          INTEGER NOT NULL,
    month         INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    channel_id    UUID REFERENCES costing_delivery_channels(id),
    quantity_sold INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(menu_item_id, year, month, channel_id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_csm_year_month ON costing_sales_monthly(year, month)`,

  // 11. Fixed Costs
  `CREATE TABLE IF NOT EXISTS costing_fixed_costs_monthly (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year           INTEGER NOT NULL,
    month          INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    rent           NUMERIC(14,2) DEFAULT 0,
    salaries       NUMERIC(14,2) DEFAULT 0,
    utilities      NUMERIC(14,2) DEFAULT 0,
    other_overhead NUMERIC(14,2) DEFAULT 0,
    notes          TEXT,
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, month)
  )`,

  // Auto-update function
  `CREATE OR REPLACE FUNCTION costing_set_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = NOW();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,

  // Triggers (wrapped in DO to avoid duplicate error)
  `DO $$ BEGIN
     CREATE TRIGGER trg_cmi_updated BEFORE UPDATE ON costing_menu_items
       FOR EACH ROW EXECUTE FUNCTION costing_set_updated_at();
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
     CREATE TRIGGER trg_cii_updated BEFORE UPDATE ON costing_item_ingredients
       FOR EACH ROW EXECUTE FUNCTION costing_set_updated_at();
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
     CREATE TRIGGER trg_cicp_updated BEFORE UPDATE ON costing_item_channel_pricing
       FOR EACH ROW EXECUTE FUNCTION costing_set_updated_at();
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
     CREATE TRIGGER trg_csm_updated BEFORE UPDATE ON costing_sales_monthly
       FOR EACH ROW EXECUTE FUNCTION costing_set_updated_at();
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
     CREATE TRIGGER trg_cfcm_updated BEFORE UPDATE ON costing_fixed_costs_monthly
       FOR EACH ROW EXECUTE FUNCTION costing_set_updated_at();
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // Seed delivery channels
  `INSERT INTO costing_delivery_channels (name, sort_order) VALUES
     ('Foodpanda', 1), ('Pathao Food', 2), ('Own Delivery', 3)
   ON CONFLICT (name) DO NOTHING`,
]

async function run() {
  console.log(`Running ${statements.length} SQL statements against Supabase...\n`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 70)
    process.stdout.write(`[${i+1}/${statements.length}] ${preview}… `)

    const { error } = await supabase.rpc('exec_sql', { sql: stmt }).then(r => r).catch(e => ({ error: e }))

    if (error) {
      // Try via from().select() trick — some Supabase setups expose pg via rpc
      // Fall back to raw query via the JS client
      try {
        // Supabase JS client doesn't expose raw SQL — use the REST /sql endpoint
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ sql: stmt })
        })
        if (res.ok) {
          console.log('✓')
        } else {
          const body = await res.text()
          console.log(`⚠ ${body.slice(0,100)}`)
        }
      } catch (e2) {
        console.log(`✗ ${error?.message || e2.message}`)
      }
    } else {
      console.log('✓')
    }
  }

  console.log('\nDone! Verifying tables exist...')

  // Check tables
  const { data, error: checkErr } = await supabase
    .from('costing_users')
    .select('id')
    .limit(1)

  if (checkErr) {
    console.log('❌ costing_users table not accessible:', checkErr.message)
    console.log('\n⚠️  The RPC approach did not work. Please paste menu-costings-schema.sql')
    console.log('   directly into Supabase SQL Editor at:')
    console.log('   https://supabase.com/dashboard/project/smaoazpzngwyuqbdghfn/sql/new')
  } else {
    console.log('✅ costing_users table is accessible!')
  }
}

run().catch(console.error)
