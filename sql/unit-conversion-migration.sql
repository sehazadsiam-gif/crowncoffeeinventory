-- ============================================
-- SQL MIGRATION: INTELLIGENT UNIT CONVERSION
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add unit column to recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'gm';

-- 2. Helper function for unit conversion
CREATE OR REPLACE FUNCTION convert_unit(qty NUMERIC, from_unit TEXT, to_unit TEXT)
RETURNS NUMERIC AS $$
DECLARE
  from_factor NUMERIC;
  to_factor NUMERIC;
BEGIN
  from_unit := lower(from_unit);
  to_unit := lower(to_unit);

  IF from_unit = to_unit THEN
    RETURN qty;
  END IF;

  -- Assign base factors relative to gm/ml
  -- 1 gm = 1, 1 ml = 1
  -- 1 kg = 1000, 1 ltr = 1000
  from_factor := CASE from_unit
    WHEN 'gm' THEN 1
    WHEN 'ml' THEN 1
    WHEN 'kg' THEN 1000
    WHEN 'ltr' THEN 1000
    ELSE NULL
  END;

  to_factor := CASE to_unit
    WHEN 'gm' THEN 1
    WHEN 'ml' THEN 1
    WHEN 'kg' THEN 1000
    WHEN 'ltr' THEN 1000
    ELSE NULL
  END;

  IF from_factor IS NULL OR to_factor IS NULL THEN
    RETURN qty;
  END IF;

  RETURN (qty * from_factor) / to_factor;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Update the sale deduction function to be unit-aware
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  rec RECORD;
  converted_qty NUMERIC;
  stock_unit TEXT;
BEGIN
  -- Update total_revenue from menu item price
  UPDATE sales
  SET total_revenue = NEW.quantity * (SELECT selling_price FROM menu_items WHERE id = NEW.menu_item_id)
  WHERE id = NEW.id;

  -- Deduct ingredients based on recipe
  FOR rec IN
    SELECT 
      r.ingredient_id, 
      r.quantity * NEW.quantity AS total_recipe_qty,
      r.unit AS recipe_unit,
      i.unit AS ingredient_unit
    FROM recipes r
    JOIN ingredients i ON i.id = r.ingredient_id
    WHERE r.menu_item_id = NEW.menu_item_id
  LOOP
    -- Convert recipe quantity to ingredient's stock unit
    converted_qty := convert_unit(rec.total_recipe_qty, rec.recipe_unit, rec.ingredient_unit);

    UPDATE ingredients
    SET current_stock = current_stock - converted_qty
    WHERE id = rec.ingredient_id;

    INSERT INTO stock_movements (ingredient_id, movement_type, quantity, reference_id, notes)
    VALUES (
      rec.ingredient_id, 
      'sale_out', 
      -converted_qty, 
      NEW.id, 
      'Sale deduction (' || rec.total_recipe_qty || ' ' || rec.recipe_unit || ' converted to ' || converted_qty || ' ' || rec.ingredient_unit || ')'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Update existing recipes if unit is null
UPDATE recipes SET unit = 'gm' WHERE unit IS NULL;
