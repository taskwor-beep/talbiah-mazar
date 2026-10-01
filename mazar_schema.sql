-- ====================================================================
-- Mazar Delivery App Database Schema
-- ====================================================================

-- 1. Users Table (Customers)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    full_name TEXT NOT NULL,
    phone_number TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'pilgrim' CHECK (role IN ('pilgrim', 'driver', 'admin')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. Drivers Table (Couriers)
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    vehicle_type TEXT NOT NULL, -- e.g., 'car', 'motorcycle', 'van'
    license_plate TEXT,
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_deliveries INTEGER DEFAULT 0,
    is_online BOOLEAN DEFAULT FALSE,
    current_latitude DOUBLE PRECISION,
    current_longitude DOUBLE PRECISION,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- 3. Restaurants / Stores Table
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    description TEXT,
    location_address TEXT NOT NULL,
    location_latitude DOUBLE PRECISION,
    location_longitude DOUBLE PRECISION,
    contact_phone TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'picking_up', 'in_transit', 'delivered', 'cancelled')),
    
    pickup_address TEXT NOT NULL,
    dropoff_address TEXT NOT NULL,
    pickup_latitude DOUBLE PRECISION,
    pickup_longitude DOUBLE PRECISION,
    dropoff_latitude DOUBLE PRECISION,
    dropoff_longitude DOUBLE PRECISION,
    
    delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'wallet')),
    payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed')),
    
    notes TEXT
);

-- 5. Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL
);

-- 6. Delivery Tracking (Optional for history/live tracking)
CREATE TABLE IF NOT EXISTS public.delivery_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status TEXT
);

-- 7. Admin Settings
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.admin_settings (key, value) VALUES 
('exchange_rate', '{"dzd_to_sar": 0.028}'::jsonb),
('social_popup', '{"is_active": false, "title": "تابعنا على المنصات الاجتماعية!", "description": "اشترك الآن ليصلك كل جديد عن عروض مزار.", "link": "https://twitter.com"}'::jsonb),
('ad_popup', '{"is_active": true, "title": "إعلان هام", "description": "احجز باقتك الآن واحصل على خصم 10% بمناسبة الموسم!", "image_url": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 8. Driver Offers
CREATE TABLE IF NOT EXISTS public.driver_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    price_dzd DECIMAL(10,2) NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- 9. Driver Packages
CREATE TABLE IF NOT EXISTS public.driver_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    price_dzd DECIMAL(10,2) NOT NULL,
    discount_dzd DECIMAL(10,2) DEFAULT 0,
    details TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- 10. Package Steps (Timeline)
CREATE TABLE IF NOT EXISTS public.package_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.driver_packages(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    title TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    price_dzd DECIMAL(10,2) NOT NULL
);
