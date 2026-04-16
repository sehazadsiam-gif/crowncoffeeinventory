-- ============================================
-- SQL MIGRATION: INTELLIGENT UNIT CONVERSION
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add unit column to recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'gm';

-- 2. Helper function for unit conversion
CREATE OR REPLACE FUNCTION convert_unit(qty NUMERIC, from_unit TEXT, to_unit TEXT)
RETURNS NUMERIC AS $$
BEGIN
  -- Normalize unit names (lowercase)
  from_unit := lower(from_unit);
  to_unit := lower(to_unit);

  -- If units are the same, no conversion needed
  IF from_unit = to_unit THEN
    RETURN qty;
  END IF;

  -- Mass Conversions
  IF from_unit = 'gm' AND to_unit = 'kg' THEN RETURN qty / 1000; END IF;
  IF from_unit = 'kg' AND to_unit = 'gm' THEN RETURN qty * 1000; END IF;

  -- Volume Conversions
  IF from_unit = 'ml' AND to_unit = 'ltr' THEN RETURN qty / 1000; END IF;
  IF from_unit = 'ltr' AND to_unit = 'ml' THEN RETURN qty * 1000; END IF;

  -- Fallback: If no conversion rule exists, return as-is
  -- (This covers pcs, box, cup etc if they match exactly)
  RETURN qty;
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
