-- ============================================================
-- CROWN COFFEE — FULL MENU ITEMS SEED DATA
-- Run this in Supabase SQL Editor to populate all 95 menu items
-- across costing_menu_items, costing_item_pricing, and menu_items tables.
-- ============================================================

-- 1. COSTING MENU ITEMS (costing_menu_items)
INSERT INTO costing_menu_items (name, category, is_active) VALUES
  -- Breakfast
  ('Traditional Breakfast', 'Breakfast', TRUE),
  ('American Breakfast', 'Breakfast', TRUE),
  ('Brunch Delight', 'Breakfast', TRUE),
  ('Grilled Chicken Sandwich', 'Breakfast', TRUE),
  ('Eggs Benedict', 'Breakfast', TRUE),

  -- Sandwich
  ('Chicken Sandwich', 'Sandwich', TRUE),
  ('Mushroom Sandwich', 'Sandwich', TRUE),
  ('Classic Club Sandwich', 'Sandwich', TRUE),

  -- Appetizers
  ('French Fries', 'Appetizers', TRUE),
  ('Japanese Fried Chicken', 'Appetizers', TRUE),
  ('Chicken Nanban', 'Appetizers', TRUE),
  ('Chicken Gyoza', 'Appetizers', TRUE),
  ('Steamed Wonton', 'Appetizers', TRUE),
  ('Fried Sesame Dory', 'Appetizers', TRUE),
  ('Fish and Chips', 'Appetizers', TRUE),
  ('High Tea (1:4)', 'Appetizers', TRUE),

  -- Soup
  ('Thai Clear Soup', 'Soup', TRUE),
  ('Thai Thick Soup', 'Soup', TRUE),
  ('Cream of Mushroom Soup', 'Soup', TRUE),

  -- Pasta
  ('Creamy Fettuccine Alfredo Pasta', 'Pasta', TRUE),
  ('Beef Bolognese Pasta', 'Pasta', TRUE),
  ('Pasta De La Casa', 'Pasta', TRUE),

  -- Noodles
  ('Stir Fried Chicken Noodles', 'Noodles', TRUE),
  ('Stir Fried Beef Noodles', 'Noodles', TRUE),

  -- Salad
  ('Cashew Nut Salad', 'Salad', TRUE),
  ('Spanish Grilled Chicken Salad', 'Salad', TRUE),

  -- Pizza
  ('BBQ Chicken Pizza', 'Pizza', TRUE),
  ('Beef Bolognese Pizza', 'Pizza', TRUE),
  ('CC Special Four Seasons', 'Pizza', TRUE),

  -- Main Course
  ('Chicken Schnitzel', 'Main Course', TRUE),
  ('Turkish Savory', 'Main Course', TRUE),
  ('Basil Leaf Beef (Spicy)', 'Main Course', TRUE),
  ('Herbed Dory with Salsa', 'Main Course', TRUE),
  ('King Prawn', 'Main Course', TRUE),
  ('Peri Peri Chicken', 'Main Course', TRUE),
  ('Crown Coffee Special Rice (Spicy)', 'Main Course', TRUE),
  ('Health Plus', 'Main Course', TRUE),

  -- Desert
  ('Chawanmushi', 'Desert', TRUE),
  ('Crêpe', 'Desert', TRUE),
  ('Sweet Madness', 'Desert', TRUE),
  ('Chocolate Lava', 'Desert', TRUE),

  -- Coffee
  ('Espresso', 'Coffee', TRUE),
  ('Cappuccino', 'Coffee', TRUE),
  ('Caffè Latte', 'Coffee', TRUE),
  ('Mocha', 'Coffee', TRUE),
  ('Macchiato', 'Coffee', TRUE),
  ('Americano', 'Coffee', TRUE),
  ('Cappuccino (Small)', 'Coffee', TRUE),
  ('Affogato', 'Coffee', TRUE),
  ('Flat White', 'Coffee', TRUE),

  -- Cold Brew & Tea
  ('Cold Brew', 'Cold Brew & Tea', TRUE),
  ('Masala Chai', 'Cold Brew & Tea', TRUE),

  -- Pastries & Desserts
  ('Butter Croissant', 'Pastries & Desserts', TRUE),
  ('New York Cheesecake', 'Pastries & Desserts', TRUE),

  -- Boba Specials
  ('Iced Coffee Boba Milk Tea', 'Boba Specials', TRUE),

  -- Shakes
  ('Nutella Shake', 'Shakes', TRUE),
  ('Vanilla Shake', 'Shakes', TRUE),
  ('Chocolate Shake', 'Shakes', TRUE),
  ('Oreo Shake', 'Shakes', TRUE),
  ('Mango Shake', 'Shakes', TRUE),
  ('Blueberry Shake', 'Shakes', TRUE),
  ('Strawberry Shake', 'Shakes', TRUE),

  -- Iced Coffee
  ('Iced Americano', 'Iced Coffee', TRUE),
  ('Iced Cappuccino', 'Iced Coffee', TRUE),
  ('Iced Latte', 'Iced Coffee', TRUE),

  -- Smoothie
  ('Mango Smoothie', 'Smoothie', TRUE),
  ('Strawberry Smoothie', 'Smoothie', TRUE),
  ('Peach Smoothie', 'Smoothie', TRUE),

  -- Hot Chocolate
  ('Regular Hot Chocolate', 'Hot Chocolate', TRUE),
  ('Frozen Hot Chocolate', 'Hot Chocolate', TRUE),

  -- Mocktails
  ('Mint Lemonade', 'Mocktails', TRUE),
  ('Blu Ocean', 'Mocktails', TRUE),
  ('Hurricane', 'Mocktails', TRUE),
  ('Crown Coffee Special', 'Mocktails', TRUE),

  -- Frappe
  ('Hazelnut Frappe', 'Frappe', TRUE),
  ('Caramel Frappe', 'Frappe', TRUE),
  ('Salted Caramel Frappe', 'Frappe', TRUE),
  ('Vanilla Frappe', 'Frappe', TRUE),
  ('Mocha Frappe', 'Frappe', TRUE),
  ('Tiramisu Frappe', 'Frappe', TRUE),

  -- Fresh Juices
  ('Orange Juice', 'Fresh Juices', TRUE),
  ('Pineapple Juice', 'Fresh Juices', TRUE),
  ('Papaya Juice', 'Fresh Juices', TRUE),
  ('Apple Juice', 'Fresh Juices', TRUE),

  -- Ice Cream
  ('Vanilla Ice Cream', 'Ice Cream', TRUE),
  ('Chocolate Ice Cream', 'Ice Cream', TRUE),
  ('Mango Ice Cream', 'Ice Cream', TRUE),

  -- Add On(s) Flavours
  ('Hazelnut Syrup', 'Add On(s) Flavours', TRUE),
  ('Caramel Syrup', 'Add On(s) Flavours', TRUE),
  ('Vanilla Syrup', 'Add On(s) Flavours', TRUE),
  ('Mocha Syrup', 'Add On(s) Flavours', TRUE),
  ('Salted Caramel Syrup', 'Add On(s) Flavours', TRUE),
  ('Tiramisu Syrup', 'Add On(s) Flavours', TRUE),

  -- Traditionals
  ('Mango Lassi', 'Traditionals', TRUE),
  ('Strawberry Lassi', 'Traditionals', TRUE)
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category, is_active = EXCLUDED.is_active;

-- 2. DINE-IN PRICING INITIALIZATION (costing_item_pricing)
INSERT INTO costing_item_pricing (menu_item_id, dine_in_price)
SELECT id, 0 FROM costing_menu_items
ON CONFLICT (menu_item_id) DO NOTHING;

-- 3. INVENTORY / POS MENU ITEMS (menu_items)
INSERT INTO menu_items (name, category, is_active)
SELECT name, category, is_active FROM costing_menu_items
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category, is_active = EXCLUDED.is_active;
