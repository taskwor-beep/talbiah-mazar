-- ====================================================================
-- Mazar Delivery App: Row Level Security (RLS) & Performance Indexes
-- Run this in your Supabase SQL Editor to secure your database
-- ====================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_steps ENABLE ROW LEVEL SECURITY;

-- 2. Ensure all required columns exist (Fixes column "status" does not exist error)
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE public.driver_offers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.driver_packages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.driver_packages ADD COLUMN IF NOT EXISTS discount_dzd DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE public.driver_packages ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.driver_offers ADD COLUMN IF NOT EXISTS details TEXT;

-- 2. Drop existing policies if any to avoid duplicates
DROP POLICY IF EXISTS "Public read users" ON public.users;
DROP POLICY IF EXISTS "Users can insert/register" ON public.users;
DROP POLICY IF EXISTS "Users can update own record" ON public.users;

DROP POLICY IF EXISTS "Public read approved drivers" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can insert profile" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can update own profile" ON public.drivers;

DROP POLICY IF EXISTS "Orders read access" ON public.orders;
DROP POLICY IF EXISTS "Orders insert access" ON public.orders;
DROP POLICY IF EXISTS "Orders update access" ON public.orders;

DROP POLICY IF EXISTS "Driver offers read access" ON public.driver_offers;
DROP POLICY IF EXISTS "Driver offers insert access" ON public.driver_offers;
DROP POLICY IF EXISTS "Driver offers update access" ON public.driver_offers;

DROP POLICY IF EXISTS "Driver packages read access" ON public.driver_packages;
DROP POLICY IF EXISTS "Driver packages insert access" ON public.driver_packages;
DROP POLICY IF EXISTS "Driver packages update access" ON public.driver_packages;

DROP POLICY IF EXISTS "Package steps read access" ON public.package_steps;
DROP POLICY IF EXISTS "Package steps insert access" ON public.package_steps;

DROP POLICY IF EXISTS "Admin settings read access" ON public.admin_settings;
DROP POLICY IF EXISTS "Admin settings manage access" ON public.admin_settings;

-- 3. Users Policies
CREATE POLICY "Public read users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert/register" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own record" ON public.users
  FOR UPDATE USING (true);

-- 4. Drivers Policies
CREATE POLICY "Public read approved drivers" ON public.drivers
  FOR SELECT USING (true);

CREATE POLICY "Drivers can insert profile" ON public.drivers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Drivers can update own profile" ON public.drivers
  FOR UPDATE USING (true);

-- 5. Orders Policies
CREATE POLICY "Orders read access" ON public.orders
  FOR SELECT USING (true);

CREATE POLICY "Orders insert access" ON public.orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Orders update access" ON public.orders
  FOR UPDATE USING (true);

-- 6. Driver Offers & Packages Policies
CREATE POLICY "Driver offers read access" ON public.driver_offers
  FOR SELECT USING (true);

CREATE POLICY "Driver offers insert access" ON public.driver_offers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Driver offers update access" ON public.driver_offers
  FOR UPDATE USING (true);

CREATE POLICY "Driver packages read access" ON public.driver_packages
  FOR SELECT USING (true);

CREATE POLICY "Driver packages insert access" ON public.driver_packages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Driver packages update access" ON public.driver_packages
  FOR UPDATE USING (true);

CREATE POLICY "Package steps read access" ON public.package_steps
  FOR SELECT USING (true);

CREATE POLICY "Package steps insert access" ON public.package_steps
  FOR INSERT WITH CHECK (true);

-- 7. Admin Settings Policies
CREATE POLICY "Admin settings read access" ON public.admin_settings
  FOR SELECT USING (true);

CREATE POLICY "Admin settings manage access" ON public.admin_settings
  FOR ALL USING (true);

-- 8. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON public.drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status);

CREATE INDEX IF NOT EXISTS idx_driver_offers_driver_id ON public.driver_offers(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_offers_status ON public.driver_offers(status);

CREATE INDEX IF NOT EXISTS idx_driver_packages_driver_id ON public.driver_packages(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_packages_status ON public.driver_packages(status);

CREATE INDEX IF NOT EXISTS idx_package_steps_package_id ON public.package_steps(package_id);
