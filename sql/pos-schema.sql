

-- 1. POS Settings table for Printer and Receipt Configurations
CREATE TABLE IF NOT EXISTS pos_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,          -- setting name (e.g., 'vat_percent', 'service_charge_percent', 'cashier_printer', 'kitchen_printer', 'bar_printer', 'receipt_width')
  value TEXT NOT NULL,               -- setting value
  category TEXT DEFAULT 'general',   -- 'software' or 'hardware'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prepopulate default settings
INSERT INTO pos_settings (key, value, category) VALUES
('vat_percent', '5', 'software'),
('service_charge_percent', '10', 'software'),
('receipt_header_title', 'Crown Coffee', 'software'),
('receipt_header_subtitle', 'Premium Coffee & Bakery', 'software'),
('receipt_address', 'Banani, Dhaka, Bangladesh', 'software'),
('receipt_phone', '+880 1700-000000', 'software'),
('receipt_bin', '123456789-BIN', 'software'),
('receipt_wifi_pass', 'CrownCoffee@2026', 'software'),
('cashier_printer_ip', '192.168.1.100', 'hardware'),
('kitchen_printer_ip', '192.168.1.101', 'hardware'),
('bar_printer_ip', '192.168.1.102', 'hardware'),
('printer_port', '9100', 'hardware'),
('receipt_width_mm', '80', 'hardware')
ON CONFLICT (key) DO NOTHING;

-- 2. Shift / Cash Registry table
CREATE TABLE IF NOT EXISTS pos_shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  opened_by UUID REFERENCES staff(id),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opening_float NUMERIC NOT NULL DEFAULT 0,
  closing_cash NUMERIC,
  actual_cash NUMERIC,
  card_total NUMERIC DEFAULT 0,
  mobile_total NUMERIC DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

-- Enable RLS
ALTER TABLE pos_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_shifts ENABLE ROW LEVEL SECURITY;

-- Disable RLS restrictions for easy sandbox testing or write open policies
CREATE POLICY "Allow read pos_settings" ON pos_settings FOR SELECT USING (true);
CREATE POLICY "Allow write pos_settings" ON pos_settings FOR ALL USING (true);
CREATE POLICY "Allow read pos_shifts" ON pos_shifts FOR SELECT USING (true);
CREATE POLICY "Allow write pos_shifts" ON pos_shifts FOR ALL USING (true);
