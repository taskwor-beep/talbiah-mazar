
import { supabase } from '../lib/supabase';

export const bookingService = {
    // 5. Create Booking
    createBooking: async (bookingData) => {
        // Enforce valid status values logic to prevent DB constraint violation
        const validStatuses = ['pending', 'confirmed', 'paid', 'completed', 'cancelled'];
        // Default to pending if invalid or missing
        if (!bookingData.status || !validStatuses.includes(bookingData.status)) {
            console.warn(`Invalid status '${bookingData.status}' corrected to 'pending'`);
            bookingData.status = 'pending';
        }

        const { data, error } = await supabase
            .from('trip_bookings')
            .insert([bookingData])
            .select()
            .single();

        if (error) {
            // Handle booking overlap constraint
            if (error.code === '23P01' || error.message?.includes('bookings_no_overlap')) {
                // If we are here, it means the DB rejected an overlap, even if our logic said it's okay (e.g. bed booking).
                // This confirms the DB constraint is too strict for room sharing.
                const friendlyError = new Error('خطأ في قاعدة البيانات: يوجد قيد يمنع الحجز المتداخل. لحجز الأسرة (Room Sharing)، يجب إزالة قيد "bookings_no_overlap" من جدول الحجوزات في Supabase.\n\nDatabase Error: Please remove the "bookings_no_overlap" constraint in Supabase to allow partial bed bookings.');
                friendlyError.code = 'DB_CONSTRAINT_BLOCK';
                throw friendlyError;
            }
            throw error;
        }
        return data;
    },

    // 1.2 My Bookings
    getUserBookings: async (userId) => {
        const { data, error } = await supabase
            .from('trip_bookings')
            .select('*, offer:offer_id(*, route:route_id(*), transporter:transporter_id(*))')
            .eq('pilgrim_id', userId)
            // Show typical booking statuses
            .in('status', ['pending', 'confirmed', 'cancelled', 'completed'])
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching bookings:', error);
            return [];
        }
        return data;
    },

    // Check if an offer is available for specific dates
    checkOfferAvailability: async (offerId, checkIn, checkOut, capacity = 4, requestedQty = 1) => {
        // Query for overlapping bookings (not cancelled)
        const { data, error } = await supabase
            .from('bookings')
            .select('check_in, check_out, guests, booking_type')
            .eq('offer_id', offerId)
            .neq('status', 'cancelled')
            .lt('check_in', checkOut)
            .gt('check_out', checkIn);

        if (error) {
            console.error('Error checking availability:', error);
            return { available: false, error: error.message };
        }

        // Detailed Day-by-Day Check
        const conflicts = [];
        const start = new Date(checkIn);
        const end = new Date(checkOut);

        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
            const dayStr = d.toISOString().split('T')[0];
            let used = 0;
            let fullBlocked = false;

            for (const b of data) {
                // Determine overlap for this specific day
                if (dayStr >= b.check_in && dayStr < b.check_out) {
                    if (b.booking_type === 'room' || b.booking_type === 'full') {
                        fullBlocked = true;
                    }
                    used += (b.guests || 1);
                }
            }

            if (fullBlocked || (used + requestedQty) > capacity) {
                conflicts.push({
                    date: dayStr,
                    available: fullBlocked ? 0 : Math.max(0, capacity - used),
                    reason: fullBlocked ? 'Full Room Booked' : 'Capacity Exceeded',
                    isFullRoom: fullBlocked
                });
            }
        }

        if (conflicts.length > 0) {
            return { available: false, conflicts, capacity };
        }

        return { available: true, capacity };
    },

    // Favorites (Using 'favorites' table)
    addToFavorites: async (userId, offerId) => {
        // Check duplication first to avoid error logs if possible
        const { data: existing } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', userId)
            .eq('offer_id', offerId)
            .single();

        if (existing) return existing;

        const { data, error } = await supabase
            .from('favorites')
            .insert([{ user_id: userId, offer_id: offerId }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    removeFromFavorites: async (userId, offerId) => {
        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', userId)
            .eq('offer_id', offerId);

        if (error) throw error;
    },

    getSavedOffers: async (userId) => {
        // Assuming foreign key relation from favorites.offer_id to offers.id exists
        const { data, error } = await supabase
            .from('favorites')
            .select('offer_id, created_at, offer:offers!inner(*, room:rooms(*, hotel:hotels(*)))')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching favorites:', error);
            return [];
        }

        // Map to standard UI object structure
        return data.map(f => {
            const offer = f.offer;
            // Safety check if relations are missing
            if (!offer || !offer.room || !offer.room.hotel) return null;

            return {
                id: offer.room.hotel.id,
                offerId: offer.id,
                offerTitle: offer.title, // Offer title displayed prominently
                name: offer.title || offer.room.hotel.name, // Use offer title if available
                hotelName: offer.room.hotel.name,
                images: offer.room.images || offer.room.hotel.images || [],
                distance: offer.room.hotel.distance_to_haram_meters,
                rating: offer.room.hotel.rating,
                price: offer.discount_price || offer.price_per_night,
                originalPrice: offer.discount_price ? offer.price_per_night : null,
                capacity: offer.room.capacity,
                city: offer.room.hotel.city,
                description: offer.room.hotel.description,
                room_type: offer.room.room_type,
                total_beds: offer.room.total_beds,
                amenities: offer.room.amenities,
                available_from: offer.available_from,
                available_to: offer.available_to,
                coordinates: { lat: offer.room.hotel.latitude, lng: offer.room.hotel.longitude }
            };
        }).filter(Boolean);
    },

    getFavoritesIds: async (userId) => {
        const { data, error } = await supabase
            .from('favorites')
            .select('offer_id')
            .eq('user_id', userId);

        if (error) return [];
        return (data || []).map(f => f.offer_id);
    },

    // Save Search
    saveSearch: async (searchData) => {
        // searchData: { user_id, city, check_in, check_out, guests, booking_type, budget_min, budget_max, is_active: true }
        const { data, error } = await supabase
            .from('saved_searches')
            .insert([searchData])
            .select()
            .single();

        if (error) {
            console.error('Error saving search:', error);
            // Don't throw, just log. It's a background action.
            return null;
        }
        return data;
    },

    // --- Deposit & Payment Functions ---

    // Mark deposit as paid (Legacy, use updateBookingStatus)
    updateDepositPaid: async (bookingId) => {
        return bookingService.updateBookingStatus(bookingId, 'confirmed', { deposit_paid: true });
    },

    // Centralized Status Update (Canonical Flow)
    updateBookingStatus: async (bookingId, status, extraFields = {}) => {
        const validStatuses = ['pending', 'confirmed', 'paid', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) throw new Error(`Invalid status: ${status}`);

        const updateData = { status, ...extraFields };

        // Canonical Rules
        if (status === 'paid' && !updateData.checked_in_at && extraFields.checked_in === true) {
            updateData.checked_in_at = new Date().toISOString();
            delete updateData.checked_in; // cleanup
        }

        const { error } = await supabase
            .from('trip_bookings')
            .update(updateData)
            .eq('id', bookingId);

        if (error) throw error;
        return true;
    },

    // Create payment record
    createPayment: async (bookingId, amount, paymentMethod = 'card') => {
        const { data, error } = await supabase
            .from('payments')
            .insert({
                booking_id: bookingId,
                amount: amount,
                payment_method: paymentMethod,
                status: 'paid',
                type: 'deposit'
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // 2. Chargily Checkout Session (Backend-Reflected Logic via Edge Functions)
    createCheckoutSession: async (bookingId, userId, bookingRef) => {
        // 1. Env Validation
        const frontendUrl = import.meta.env.VITE_FRONTEND_BASE_URL;

        // 2. Fetch Booking for Amount (Security)
        console.log('[bookingService] createCheckoutSession called', { bookingId, userId });
        const { data: booking, error } = await supabase
            .from('trip_bookings')
            .select('total_price, offer:offer_id(price_total), passengers_count, trip_date')
            .eq('id', bookingId)
            .single();

        console.log('[bookingService] Booking fetched:', booking, error);

        if (error || !booking) throw new Error('Booking not found');

        // Full price is paid
        const amount = booking.total_price || booking.offer.price_total;

        if (amount <= 0) throw new Error('Invalid amount');

        // 3. Prepare Payload for Edge Function
        // Use window.location.origin to handle dynamic ports (e.g. 5173, 3000, 3001)
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : frontendUrl;

        // Note: The webhook URL should point to your deployed Supabase Edge Function.
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';
        const webhookUrl = `${supabaseUrl}/functions/v1/chargily-webhook`;

        // Fetch Customer Profile for Auto-fill
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone, email')
            .eq('id', userId)
            .single();

        const { data: modeData } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'chargily_live_mode')
            .maybeSingle();
        const isLiveMode = modeData?.value;
        const chargilyMode = (isLiveMode === 'true' || isLiveMode === true) ? 'live' : 'test';

        const payload = {
            bookingId: bookingId,
            amount: amount, 
            successUrl: `${baseUrl}/payment/success?booking_id=${bookingId}`,
            failureUrl: `${baseUrl}/payment/failure?booking_id=${bookingId}`,
            webhookEndpoint: webhookUrl,
            customerName: profile?.full_name || 'Guest User',
            customerEmail: profile?.email || 'guest@taskiin.com',
            customerPhone: profile?.phone || '',
            mode: chargilyMode
        };

        // 4. Call Supabase Edge Function
        try {
            const { data, error: invokeError } = await supabase.functions.invoke('chargily-checkout', {
                body: payload
            });

            if (invokeError) {
                console.error('Edge Function Error:', invokeError);
                throw new Error(`Edge Function Error: ${invokeError.message}`);
            }

            console.log('Edge Function Response:', data);

            return data;
        } catch (e) {
            console.error('Checkout creation failed:', e);
            throw e;
        }
    },

    // Get booking by ID (for voucher page)
    getBookingById: async (bookingId) => {
        const { data, error } = await supabase
            .from('bookings')
            .select('*, offer:offers(*, room:rooms(*, hotel:hotels(*)))')
            .eq('id', bookingId)
            .single();
        if (error) throw error;
        return data;
    },

    // Get booking by reference (for voucher page)
    getBookingByRef: async (bookingRef) => {
        const { data, error } = await supabase
            .from('bookings')
            .select('*, offer:offers(*, room:rooms(*, hotel:hotels(*)))')
            .eq('booking_ref', bookingRef)
            .single();
        if (error) throw error;
        return data;
    },

    // Real-time subscription for booking changes (Digital Handshake)
    subscribeToBooking: (bookingId, callback) => {
        return supabase
            .channel(`booking:${bookingId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'bookings',
                filter: `id=eq.${bookingId}`
            }, payload => {
                callback(payload.new);
            })
            .subscribe();
    },

    // Simulate hotel check-in (Dev Only - for testing)
    simulateCheckIn: async (bookingId) => {
        const { data, error } = await supabase
            .from('bookings')
            .update({ checked_in_at: new Date().toISOString() })
            .eq('id', bookingId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    getPublicUrl: (path) => {
        const { data } = supabase.storage.from('rooms').getPublicUrl(path);
        return data.publicUrl;
    },

    getNotifications: async (hotelId) => {
        const { data } = await supabase.from('notifications')
            .select('*').eq('receiver_id', hotelId).neq('type', 'chat').order('created_at', { ascending: false }).limit(10);
        return data || [];
    },

    subscribeToNotifications: (hotelId, callback) => {
        return supabase.channel('hotel-notifs-' + hotelId)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `receiver_id=eq.${hotelId}` },
                payload => {
                    if (payload.new.type !== 'chat') callback(payload.new);
                }
            ).subscribe();
    },

    // Get roommates / offer pilgrims (Flexible)
    getOfferPilgrims: async (offerId, checkIn = null, checkOut = null, currentUserId = null, limit = null) => {
        // Build Query
        let query = supabase
            .from('bookings')
            .select(`
                user_id,
                guests,
                status,
                check_in,
                check_out,
                profile:profiles!bookings_user_id_fkey(
                    id, 
                    full_name, 
                    avatar_url, 
                    privacy_settings,
                    state,
                    city,
                    bio_tags
                )
            `)
            .eq('offer_id', offerId)
            // Strict Roommates Logic: Only Confirmed/Paid/Completed
            .in('status', ['confirmed', 'paid', 'completed'])
            .order('created_at', { ascending: false });

        // Optional Date Filter (Strict Roommate Logic)
        if (checkIn && checkOut) {
            query = query.lt('check_in', checkOut).gt('check_out', checkIn);
        }

        // Optional User Exclusion
        if (currentUserId) {
            query = query.neq('user_id', currentUserId);
        }

        // Limit results (for "last N guests" mode when no dates)
        if (limit) {
            query = query.limit(limit);
        }

        const { data: bookings, error: bookingsError } = await query;

        if (bookingsError) {
            console.error('[getOfferPilgrims] Error fetching bookings:', bookingsError);
            return [];
        }

        if (!bookings || bookings.length === 0) {
            return [];
        }

        // Deduplicate users (in case they have multiple bookings in that range)
        const uniqueUsers = {};

        bookings.forEach(b => {
            const p = b.profile;
            if (p && !uniqueUsers[p.id]) {
                const privacy = p.privacy_settings || {};
                const hideIdentity = privacy.hide_identity || false;
                // Privacy Logic
                // Name: Show Full Name (unless hidden)
                const realName = p.full_name || 'Mautamir';
                const displayName = (hideIdentity || privacy.hideName) ? 'معتمر' : realName;

                // Avatar: Show or placeholder
                const displayAvatar = (hideIdentity || privacy.hidePhoto) ? null : p.avatar_url;

                uniqueUsers[p.id] = {
                    id: p.id,
                    name: displayName,
                    avatar: displayAvatar,
                    wilaya: p.state || p.city || '',
                    bio_tags: p.bio_tags || [], // Assume bio_tags is array or string
                    check_in: b.check_in,
                    check_out: b.check_out
                };
            }
        });

        return Object.values(uniqueUsers);
    }

};
