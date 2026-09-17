import React, { useState, useRef, useEffect } from 'react';
import {
    Briefcase, MapPin, Calendar, Download, AlertCircle, Navigation, Phone, Users, Shield, Check, X
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { pilgrimService } from '../services/pilgrimService';
import { supabase } from '../lib/supabase';
import { bookingService } from '../services/bookingService';
import { useBookings } from '../hooks/useBookings';

// Status Badge Component
const StatusBadge = ({ status, t, lang }) => {
    let effectiveStatus = status;

    const styles = {
        paid: 'bg-green-100 text-green-700 border border-green-200',
        confirmed: 'bg-emerald-50 text-emerald-700', 
        pending: 'bg-amber-50 text-amber-700 border border-amber-200',
        cancelled: 'bg-red-50 text-red-700', 
        completed: 'bg-blue-50 text-blue-700'
    };
    const labels = {
        paid: lang === 'ar' ? 'تم الدفع' : 'Paid',
        confirmed: lang === 'ar' ? 'مؤكد' : 'Confirmed',
        pending: lang === 'ar' ? 'بانتظار الدفع' : 'Waiting Payment',
        cancelled: lang === 'ar' ? 'ملغي' : 'Cancelled',
        completed: lang === 'ar' ? 'مكتمل' : 'Completed'
    };
    return <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${styles[effectiveStatus] || 'bg-gray-100'}`}>{labels[effectiveStatus] || effectiveStatus}</span>;
};

// BottomSheet Component
const BottomSheet = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white w-full max-w-lg rounded-t-3xl shadow-2xl animate-slide-up max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-100 sticky top-0 bg-white">
                    <h3 className="font-bold text-lg text-gray-900">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">{children}</div>
            </div>
        </div>
    );
};

const BookingsPage = ({ t, lang, onOpenChat, showToast }) => {
    const { user } = useData();
    const { data: globalBookings = [], isLoading: globalLoading, refetch: refreshBookings } = useBookings(user?.id);

    const [selectedBooking, setSelectedBooking] = useState(null);
    const [cancelModal, setCancelModal] = useState({ open: false, booking: null });

    const handleCancelConfirm = async () => {
        if (!cancelModal.booking) return;
        try {
            // Need a cancel function in tripService, using supabase directly here for quick fix
            await supabase.from('trip_bookings').update({ status: 'cancelled' }).eq('id', cancelModal.booking.id);
            await refreshBookings();
            setCancelModal({ open: false, booking: null });
        } catch (e) { if (showToast) showToast(e.message); }
    };

    if (globalLoading && globalBookings.length === 0) return <div className="text-center py-10 text-gray-400">{t.loading}</div>;

    if (globalBookings.length === 0) return <div className="text-center py-10 bg-white rounded-2xl"><Briefcase className="mx-auto text-gray-300 mb-2" /><p className="text-gray-500">{t.noData}</p></div>;

    return (
        <div className="space-y-4 pb-20" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <h2 className="text-lg font-bold text-gray-900">{t.upcomingBookings || (lang === 'ar' ? 'حجوزاتي القادمة' : 'My Upcoming Bookings')}</h2>
            
            {globalBookings.map(booking => {
                const offer = booking.offer || {};
                const route = offer.route || {};
                const transporter = offer.transporter || {};
                const totalPrice = booking.total_price || offer.price_total || 0;

                return (
                    <div key={booking.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                        <div className="relative h-36">
                            <img src={route.cover_image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500'} alt="" className="w-full h-full object-cover" />
                            <div className={`absolute top-3 ${lang === 'ar' ? 'left-3' : 'right-3'}`}>
                                <StatusBadge status={booking.status} t={t} lang={lang} />
                            </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-gray-900 text-lg mb-1">{route.title || (lang === 'ar' ? 'مسار الرحلة' : 'Route')}</h3>
                            <div className="text-sm text-gray-500 mb-1">{lang === 'ar' ? 'الناقل: ' : 'Transporter: '}{transporter.full_name}</div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                                <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg text-xs"><Calendar size={14} />{booking.trip_date}</span>
                                <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg text-xs"><Users size={14} />{booking.passengers_count} {lang === 'ar' ? 'ركاب' : 'Passengers'}</span>
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                <div><span className="text-xl font-bold text-emerald-800">{totalPrice.toLocaleString()}</span><span className="text-sm text-gray-500 mr-1"> DZD</span></div>
                                <div className="flex gap-2">
                                    {booking.status === 'pending' && (
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                    if (showToast) showToast(lang === 'ar' ? 'جاري تحويلك للدفع...' : 'Redirecting to payment...');
                                                    const session = await bookingService.createCheckoutSession(
                                                        booking.id,
                                                        user?.id,
                                                        booking.id.slice(0, 8).toUpperCase()
                                                    );
                                                    const checkoutUrl = session.checkout_url || session.url || (session.data && session.data.checkout_url);
                                                    if (!checkoutUrl) throw new Error('No checkout URL returned');
                                                    window.location.href = checkoutUrl;
                                                } catch (err) {
                                                    console.error(err);
                                                    if (showToast) showToast(lang === 'ar' ? 'خطأ في بدء الدفع' : 'Payment Error');
                                                }
                                            }}
                                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm shadow-emerald-200"
                                        >
                                            {lang === 'ar' ? 'إدفع الآن' : 'Pay Now'}
                                        </button>
                                    )}
                                    {booking.status === 'pending' && (
                                        <button onClick={(e) => { e.stopPropagation(); setCancelModal({ open: true, booking }); }} className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors">{t.cancel || (lang === 'ar' ? 'إلغاء' : 'Cancel')}</button>
                                    )}
                                    <button onClick={() => setSelectedBooking({ ...booking, offer, route, transporter, totalPrice })} className="px-4 py-2 bg-emerald-50 text-emerald-800 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors">{t.bookingDetails || (lang === 'ar' ? 'التفاصيل' : 'Details')}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Booking Details Modal */}
            <BottomSheet isOpen={!!selectedBooking} onClose={() => setSelectedBooking(null)} title={t.bookingDetails || (lang === 'ar' ? 'تفاصيل الحجز' : 'Booking Details')}>
                {selectedBooking && (
                    <div className="space-y-4">
                        <img src={selectedBooking.route?.cover_image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500'} alt="" className="w-full h-40 object-cover rounded-xl" />

                        <div>
                            <h4 className="font-bold text-gray-900 text-lg">{selectedBooking.route?.title}</h4>
                            <p className="text-sm font-medium text-emerald-800 mb-1">{lang === 'ar' ? 'الناقل: ' : 'Transporter: '}{selectedBooking.transporter?.full_name}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 p-3 rounded-xl">
                                <div className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'تاريخ الرحلة' : 'Trip Date'}</div>
                                <div className="font-bold text-gray-900">{selectedBooking.trip_date}</div>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-xl flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'عدد الركاب' : 'Passengers'}</div>
                                    <div className="font-bold text-gray-900">{selectedBooking.passengers_count}</div>
                                </div>
                                <Users className="text-gray-400" size={20} />
                            </div>
                        </div>

                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                            <div className="flex justify-between items-center pt-2 border-emerald-200">
                                <span className="font-bold text-gray-900">{lang === 'ar' ? 'المبلغ الإجمالي' : 'Total Price'}</span>
                                <span className="text-xl font-bold text-emerald-800">{selectedBooking.totalPrice?.toLocaleString()} DZD</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <span className="text-sm text-gray-600">{t.status || (lang === 'ar' ? 'حالة الحجز' : 'Status')}</span>
                            <StatusBadge status={selectedBooking.status} t={t} lang={lang} />
                        </div>

                        <div className="text-center text-xs text-gray-400 mt-4">
                            {lang === 'ar' ? 'رقم الحجز:' : 'Booking Ref:'} <span className="font-mono font-bold">{selectedBooking.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                    </div>
                )}
            </BottomSheet>

            {/* Cancel Confirmation Modal */}
            {cancelModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setCancelModal({ open: false, booking: null })}>
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle size={32} className="text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{lang === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancellation'}</h3>
                            <p className="text-sm text-gray-500">{lang === 'ar' ? 'هل أنت متأكد من إلغاء هذا الحجز؟' : 'Are you sure you want to cancel?'}</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setCancelModal({ open: false, booking: null })} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                                {lang === 'ar' ? 'تراجع' : 'Go Back'}
                            </button>
                            <button onClick={handleCancelConfirm} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">
                                {lang === 'ar' ? 'تأكيد الإلغاء' : 'Cancel Booking'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingsPage;
