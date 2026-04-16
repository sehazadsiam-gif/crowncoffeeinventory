-- ============================================
-- CAFE INVENTORY SYSTEM - SUPABASE SQL SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. INGREDIENTS (raw stock items)
CREATE TABLE ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL,          -- e.g. "gm", "ml", "pcs", "kg", "liter"
  current_stock NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 0, -- low stock alert threshold
  cost_per_unit NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MENU ITEMS
CREATE TABLE menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,      -- e.g. "Coffee", "Food", "Beverage"
  selling_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RECIPES (which ingredients each menu item needs)
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,   -- how much of the ingredient per 1 serving
  UNIQUE(menu_item_id, ingredient_id)
);

-- 4. DAILY BAZAR (purchases each day)
CREATE TABLE bazar_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  cost_per_unit NUMERIC NOT NULL,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * cost_per_unit) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SALES LOG (daily sales input)
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  total_revenue NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. STOCK MOVEMENTS (audit trail of every stock change)
CREATE TABLE stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL, -- 'bazar_in', 'sale_out', 'manual_adjust', 'waste'
  quantity NUMERIC NOT NULL,   -- positive = added, negative = removed
  reference_id UUID,           -- links to bazar_entry or sale id
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update stock when bazar entry is added
CREATE OR REPLACE FUNCTION update_stock_on_bazar()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ingredients
  SET current_stock = current_stock + NEW.quantity,
      cost_per_unit = NEW.cost_per_unit
  WHERE id = NEW.ingredient_id;

  INSERT INTO stock_movements (ingredient_id, movement_type, quantity, reference_id, notes)
  VALUES (NEW.ingredient_id, 'bazar_in', NEW.quantity, NEW.id, 'Bazar purchase on ' || NEW.date);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bazar_stock
AFTER INSERT ON bazar_entries
FOR EACH ROW EXECUTE FUNCTION update_stock_on_bazar();

-- Auto-deduct stock when a sale is logged
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Update total_revenue from menu item price
  UPDATE sales
  SET total_revenue = NEW.quantity * (SELECT selling_price FROM menu_items WHERE id = NEW.menu_item_id)
  WHERE id = NEW.id;

  -- Deduct ingredients based on recipe
  FOR rec IN
    SELECT r.ingredient_id, r.quantity * NEW.quantity AS total_qty
    FROM recipes r
    WHERE r.menu_item_id = NEW.menu_item_id
  LOOP
    UPDATE ingredients
    SET current_stock = current_stock - rec.total_qty
    WHERE id = rec.ingredient_id;

    INSERT INTO stock_movements (ingredient_id, movement_type, quantity, reference_id, notes)
    VALUES (rec.ingredient_id, 'sale_out', -rec.total_qty, NEW.id, 'Sale deduction');
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sale_stock
AFTER INSERT ON sales
FOR EACH ROW EXECUTE FUNCTION update_stock_on_sale();

-- ============================================
-- SAMPLE DATA (optional - delete if not needed)
-- ============================================

INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit) VALUES
('Espresso Beans', 'gm', 2000, 500, 1.2),
('Whole Milk', 'ml', 5000, 1000, 0.08),
('Sugar', 'gm', 3000, 500, 0.05),
('Bread', 'pcs', 20, 5, 12),
('Butter', 'gm', 500, 100, 0.9),
('Tea Leaves', 'gm', 500, 100, 0.6),
('Whipped Cream', 'ml', 1000, 200, 0.15);

INSERT INTO menu_items (name, category, selling_price) VALUES
('Espresso', 'Coffee', 150),
('Cappuccino', 'Coffee', 220),
('Latte', 'Coffee', 250),
('Masala Tea', 'Tea', 80),
('Butter Toast', 'Food', 120);

-- Espresso recipe
INSERT INTO recipes (menu_item_id, ingredient_id, quantity)
SELECT m.id, i.id, 18
FROM menu_items m, ingredients i
WHERE m.name = 'Espresso' AND i.name = 'Espresso Beans';

-- Cappuccino recipe
INSERT INTO recipes (menu_item_id, ingredient_id, quantity)
SELECT m.id, i.id, v.qty
FROM menu_items m
JOIN (VALUES
  ('Espresso Beans', 18),
  ('Whole Milk', 120),
  ('Sugar', 10)
) AS v(iname, qty) ON true
JOIN ingredients i ON i.name = v.iname
WHERE m.name = 'Cappuccino';

-- Latte recipe
INSERT INTO recipes (menu_item_id, ingredient_id, quantity)
SELECT m.id, i.id, v.qty
FROM menu_items m
JOIN (VALUES
  ('Espresso Beans', 18),
  ('Whole Milk', 200),
  ('Sugar', 10)
) AS v(iname, qty) ON true
JOIN ingredients i ON i.name = v.iname
WHERE m.name = 'Latte';

-- Masala Tea recipe
INSERT INTO recipes (menu_item_id, ingredient_id, quantity)
SELECT m.id, i.id, v.qty
FROM menu_items m
JOIN (VALUES
  ('Tea Leaves', 5),
  ('Whole Milk', 100),
  ('Sugar', 15)
) AS v(iname, qty) ON true
JOIN ingredients i ON i.name = v.iname
WHERE m.name = 'Masala Tea';

-- Butter Toast recipe
INSERT INTO recipes (menu_item_id, ingredient_id, quantity)
SELECT m.id, i.id, v.qty
FROM menu_items m
JOIN (VALUES
  ('Bread', 2),
  ('Butter', 20)
) AS v(iname, qty) ON true
JOIN ingredients i ON i.name = v.iname
WHERE m.name = 'Butter Toast';
