-- 1. Profiles Table Update (or Recreation)
-- Assuming auth.users is already handling authentication
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('pilgrim', 'transporter', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- If profiles already exists, we alter it, but for a clean state based on your requirements:
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone_number TEXT,
    role user_role DEFAULT 'pilgrim',
    is_verified BOOLEAN DEFAULT false,
    wallet_balance DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: In a real migration you would ALTER the existing profiles table.
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(12, 2) DEFAULT 0.00;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 2. Routes Table (Managed by Admin)
CREATE TABLE IF NOT EXISTS public.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT NOT NULL, -- Beautiful picture of the Destination
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Transporter Offers Table
CREATE TABLE IF NOT EXISTS public.transporter_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
    price_total DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Trip Bookings Table
DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('pending', 'paid_online', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE trip_status_enum AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.trip_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pilgrim_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES public.transporter_offers(id) ON DELETE CASCADE,
    travel_date DATE NOT NULL,
    pickup_location TEXT NOT NULL,
    total_paid DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) NOT NULL,
    transporter_earnings DECIMAL(10, 2) NOT NULL,
    payment_status payment_status_enum DEFAULT 'pending',
    trip_status trip_status_enum DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transporter_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users can read all (to see transporter info), update their own.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Routes: Everyone can read, only admin can insert/update (assuming admin role check is handled via function or auth.jwt)
DROP POLICY IF EXISTS "Routes are viewable by everyone." ON public.routes;
CREATE POLICY "Routes are viewable by everyone." ON public.routes FOR SELECT USING (true);

-- Transporter Offers: Pilgrims see active offers, Transporters manage their own.
DROP POLICY IF EXISTS "Anyone can view active offers." ON public.transporter_offers;
CREATE POLICY "Anyone can view active offers." ON public.transporter_offers FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Transporters can view their own offers." ON public.transporter_offers;
CREATE POLICY "Transporters can view their own offers." ON public.transporter_offers FOR SELECT USING (auth.uid() = transporter_id);

DROP POLICY IF EXISTS "Transporters can insert their own offers." ON public.transporter_offers;
CREATE POLICY "Transporters can insert their own offers." ON public.transporter_offers FOR INSERT WITH CHECK (auth.uid() = transporter_id);

DROP POLICY IF EXISTS "Transporters can update their own offers." ON public.transporter_offers;
CREATE POLICY "Transporters can update their own offers." ON public.transporter_offers FOR UPDATE USING (auth.uid() = transporter_id);

-- Trip Bookings: Pilgrims see their bookings, Transporters see bookings for their offers.
DROP POLICY IF EXISTS "Pilgrims can view their bookings" ON public.trip_bookings;
CREATE POLICY "Pilgrims can view their bookings" ON public.trip_bookings FOR SELECT USING (auth.uid() = pilgrim_id);

DROP POLICY IF EXISTS "Transporters can view bookings for their offers" ON public.trip_bookings;
CREATE POLICY "Transporters can view bookings for their offers" ON public.trip_bookings FOR SELECT USING (
    auth.uid() IN (SELECT transporter_id FROM public.transporter_offers WHERE id = offer_id)
);

DROP POLICY IF EXISTS "Pilgrims can create bookings" ON public.trip_bookings;
CREATE POLICY "Pilgrims can create bookings" ON public.trip_bookings FOR INSERT WITH CHECK (auth.uid() = pilgrim_id);

DROP POLICY IF EXISTS "Transporters can update their bookings (e.g., mark completed)" ON public.trip_bookings;
CREATE POLICY "Transporters can update their bookings (e.g., mark completed)" ON public.trip_bookings FOR UPDATE USING (
    auth.uid() IN (SELECT transporter_id FROM public.transporter_offers WHERE id = offer_id)
);

-- Trigger Function for Payout
CREATE OR REPLACE FUNCTION process_transporter_payout()
RETURNS TRIGGER AS $$
DECLARE
    v_transporter_id UUID;
BEGIN
    -- Only process if the trip_status has changed to 'completed'
    IF NEW.trip_status = 'completed' AND OLD.trip_status IS DISTINCT FROM 'completed' THEN
        
        -- Make sure the payment was actually paid online
        IF NEW.payment_status = 'paid_online' THEN
            
            -- Get the transporter_id from the offer
            SELECT transporter_id INTO v_transporter_id
            FROM public.transporter_offers
            WHERE id = NEW.offer_id;

            -- Update the transporter's wallet balance
            UPDATE public.profiles
            SET wallet_balance = wallet_balance + NEW.transporter_earnings
            WHERE id = v_transporter_id;
            
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the trip_bookings table
DROP TRIGGER IF EXISTS on_trip_completed_payout ON public.trip_bookings;
CREATE TRIGGER on_trip_completed_payout
AFTER UPDATE OF trip_status ON public.trip_bookings
FOR EACH ROW
EXECUTE FUNCTION process_transporter_payout();
