import { supabase } from '../lib/supabase';

export const tripService = {
    // Get all available routes (e.g. Makkah -> Madinah)
    getRoutes: async () => {
        const { data, error } = await supabase
            .from('routes')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
            
        if (error) throw error;
        return data;
    },

    // Get transporter offers based on filters
    searchOffers: async (filters = {}) => {
        let query = supabase
            .from('transporter_offers')
            .select(`
                *,
                route:route_id (*),
                transporter:transporter_id (
                    id,
                    full_name,
                    avatar_url,
                    phone,
                    city
                )
            `)
            .eq('is_active', true);
            
        if (filters.route_id && filters.route_id !== 'all') {
            query = query.eq('route_id', filters.route_id);
        }
        
        if (filters.vehicle_type && filters.vehicle_type !== 'all') {
            query = query.eq('vehicle_type', filters.vehicle_type);
        }
        
        // Ensure the transporter still has their role
        // This is handled by RLS, but we can assume if the offer is active, it's valid.

        const { data, error } = await query;
        if (error) throw error;
        
        return data;
    },

    // Create a trip booking
    createBooking: async (bookingData) => {
        // bookingData should include: pilgrim_id, offer_id, trip_date, passengers_count, total_price, requirements
        const { data, error } = await supabase
            .from('trip_bookings')
            .insert([{
                ...bookingData,
                status: 'pending',
                payment_status: 'pending'
            }])
            .select()
            .single();
            
        if (error) throw error;
        return data;
    },

    // Get bookings for a pilgrim
    getPilgrimBookings: async (pilgrimId) => {
        const { data, error } = await supabase
            .from('trip_bookings')
            .select(`
                *,
                offer:offer_id (
                    *,
                    route:route_id (*),
                    transporter:transporter_id (full_name, phone)
                )
            `)
            .eq('pilgrim_id', pilgrimId)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        return data;
    },

    // Get bookings for a transporter
    getTransporterBookings: async (transporterId) => {
        const { data, error } = await supabase
            .from('trip_bookings')
            .select(`
                *,
                offer:offer_id!inner (
                    *,
                    route:route_id (*)
                ),
                pilgrim:pilgrim_id (full_name, phone)
            `)
            .eq('offer.transporter_id', transporterId)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        return data;
    }
};
