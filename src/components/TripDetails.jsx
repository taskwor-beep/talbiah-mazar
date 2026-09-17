import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Navigation, MapPin, Calendar, Users, Phone, Shield } from 'lucide-react';
import { bookingService } from '../services/bookingService';
import { tripService } from '../services/tripService';

const TripDetails = ({ hotel: offer, onBack, lang, user, showToast }) => {
  // We passed "hotel" as prop just to minimize App.jsx changes, but it's actually an offer.
  const [isBooking, setIsBooking] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Dictionaries for quick translation
  const t = (key) => {
    const dict = {
      ar: {
        bookNow: 'ادفع واحجز الآن',
        totalPrice: 'المبلغ الإجمالي',
        passengers: 'عدد الركاب',
        date: 'تاريخ الرحلة',
        transporter: 'الناقل',
        phone: 'الهاتف',
        route: 'المسار',
        details: 'تفاصيل الرحلة',
        paymentInfo: 'الدفع يتم إلكترونياً عبر شارجيلي لضمان حقوقك',
        loading: 'جاري التحويل...'
      },
      en: {
        bookNow: 'Pay & Book Now',
        totalPrice: 'Total Price',
        passengers: 'Passengers',
        date: 'Trip Date',
        transporter: 'Transporter',
        phone: 'Phone',
        route: 'Route',
        details: 'Trip Details',
        paymentInfo: 'Payment is securely processed via Chargily',
        loading: 'Redirecting...'
      }
    };
    return dict[lang]?.[key] || key;
  };

  const handleBooking = async () => {
    if (!user) {
      if (showToast) showToast(lang === 'ar' ? 'الرجاء تسجيل الدخول أولاً' : 'Please login first');
      return;
    }
    setIsBooking(true);
    try {
      // Create a booking record
      const bookingData = {
        pilgrim_id: user.id,
        offer_id: offer.id,
        trip_date: date,
        passengers_count: passengers,
        total_price: offer.price_total,
      };
      
      const newBooking = await tripService.createBooking(bookingData);
      
      if (showToast) showToast(t('loading'));

      // Forward to Chargily via bookingService's createCheckoutSession
      const session = await bookingService.createCheckoutSession(
        newBooking.id, 
        user.id, 
        newBooking.id.slice(0, 8).toUpperCase()
      );
      
      const checkoutUrl = session.checkout_url || session.url || (session.data && session.data.checkout_url);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error('No checkout URL');
      }

    } catch (e) {
      console.error(e);
      if (showToast) showToast(lang === 'ar' ? 'فشل إنشاء الحجز' : 'Failed to create booking');
      setIsBooking(false);
    }
  };

  return (
    <div className="bg-stone-50 min-h-screen pb-20" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md z-40 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
            {lang === 'ar' ? <ChevronRight size={24} className="text-gray-600" /> : <ChevronLeft size={24} className="text-gray-600" />}
          </button>
          <h1 className="text-xl font-bold text-gray-900 line-clamp-1">
            {offer?.route?.title || t('details')}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="pt-20 px-4 max-w-3xl mx-auto space-y-6">
        
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
              <Navigation size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t('route')}</h2>
              <p className="text-emerald-700 font-bold">{offer?.route?.title}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-2xl">
              <div className="text-sm text-gray-500 mb-1">{t('transporter')}</div>
              <div className="font-bold text-gray-900">{offer?.transporter?.full_name}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-500 mb-1">{t('phone')}</div>
                <div className="font-bold text-gray-900">{offer?.transporter?.phone || '---'}</div>
              </div>
              <Phone className="text-emerald-500" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('details')}</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{t('date')}</label>
              <input 
                type="date" 
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{t('passengers')}</label>
              <input 
                type="number" 
                min="1"
                max={offer?.vehicle_type === 'bus' ? 50 : 4}
                value={passengers}
                onChange={e => setPassengers(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Security Info */}
        <div className="flex gap-3 bg-blue-50 text-blue-800 p-4 rounded-2xl items-center">
          <Shield className="shrink-0" size={24} />
          <p className="text-sm font-medium">{t('paymentInfo')}</p>
        </div>

      </div>

      {/* Footer Booking Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-40 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">{t('totalPrice')}</div>
            <div className="text-2xl font-black text-emerald-700">
              {offer?.price_total} <span className="text-sm font-medium">DZD</span>
            </div>
          </div>
          <button 
            onClick={handleBooking}
            disabled={isBooking}
            className={`flex-1 ${isBooking ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-bold py-3.5 px-6 rounded-2xl transition-colors text-center shadow-lg shadow-emerald-200 flex justify-center items-center gap-2`}
          >
            {isBooking ? t('loading') : t('bookNow')}
          </button>
        </div>
      </div>

    </div>
  );
};

export default TripDetails;
