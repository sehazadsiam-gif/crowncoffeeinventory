-- ============================================================
-- EQUIPMENT CHECK-LIST SCHEMA
-- Crown Coffee Management System
-- ============================================================

CREATE TABLE IF NOT EXISTS equipment_checklist (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name    TEXT NOT NULL,
  quantity     INT NOT NULL DEFAULT 1,
  price        NUMERIC DEFAULT NULL,
  month        INT NOT NULL,
  year         INT NOT NULL,
  status       TEXT DEFAULT 'working' CHECK (status IN ('working', 'maintenance', 'damaged', 'checked')),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_checklist_month_year ON equipment_checklist(month, year);
ALTER TABLE equipment_checklist ENABLE ROW LEVEL SECURITY;
