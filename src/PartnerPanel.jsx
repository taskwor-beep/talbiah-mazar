import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Tag, Briefcase, Wallet, User, Globe, LogOut,
    Plus, Edit, Trash2, Check, X, AlertCircle, Calendar,
    Navigation, Car, Bus, Settings, CreditCard, Download
} from 'lucide-react';
import { authService } from './services/authService';
import { tripService } from './services/tripService';
import { supabase } from './lib/supabase';
import { toast } from 'react-hot-toast';
import { Footer } from './components/Footer';

// Quick translation dictionary
const T = {
    ar: {
        overview: 'الرئيسية', offers: 'عروضي', bookings: 'الحجوزات', finance: 'المالية', profile: 'الملف الشخصي',
        addOffer: 'إضافة عرض جديد', editOffer: 'تعديل العرض', delete: 'حذف', save: 'حفظ', cancel: 'إلغاء',
        selectRoute: 'اختر المسار', vehicleType: 'نوع المركبة', price: 'التكلفة الإجمالية',
        car: 'سيارة خاصة', bus: 'حافلة', status: 'الحالة', actions: 'إجراءات',
        pending: 'بانتظار التأكيد', active: 'نشط', completed: 'مكتمل', cancelled: 'ملغي', paid: 'تم الدفع',
        route: 'المسار', passengers: 'الركاب', date: 'تاريخ الرحلة',
        totalEarnings: 'إجمالي الدخل', netProfit: 'صافي الربح', backHome: 'العودة للرئيسية', logout: 'تسجيل الخروج',
        noData: 'لا توجد بيانات', currency: 'د.ج', loading: 'جاري التحميل...',
        confirmDelete: 'هل أنت متأكد من الحذف؟', totalBookings: 'إجمالي الحجوزات',
        recentBookings: 'أحدث الحجوزات', client: 'المعتمر'
    },
    en: {
        overview: 'Overview', offers: 'My Offers', bookings: 'Bookings', finance: 'Finance', profile: 'Profile',
        addOffer: 'Add New Offer', editOffer: 'Edit Offer', delete: 'Delete', save: 'Save', cancel: 'Cancel',
        selectRoute: 'Select Route', vehicleType: 'Vehicle Type', price: 'Total Price',
        car: 'Private Car', bus: 'Bus', status: 'Status', actions: 'Actions',
        pending: 'Pending', active: 'Active', completed: 'Completed', cancelled: 'Cancelled', paid: 'Paid',
        route: 'Route', passengers: 'Passengers', date: 'Trip Date',
        totalEarnings: 'Total Earnings', netProfit: 'Net Profit', backHome: 'Back Home', logout: 'Logout',
        noData: 'No data found', currency: 'DZD', loading: 'Loading...',
        confirmDelete: 'Are you sure you want to delete?', totalBookings: 'Total Bookings',
        recentBookings: 'Recent Bookings', client: 'Client'
    }
};

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <h3 className="font-bold text-lg text-gray-900">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-4 max-h-[70vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

const Sidebar = ({ active, setActive, lang, setRole, isOpen, onClose }) => {
    const t = T[lang];
    const menu = [
        { id: 'overview', icon: LayoutDashboard },
        { id: 'offers', icon: Tag },
        { id: 'bookings', icon: Briefcase },
        { id: 'finance', icon: Wallet },
        { id: 'profile', icon: User }
    ];

    const transformClass = isOpen ? 'translate-x-0' : (lang === 'ar' ? 'translate-x-full' : '-translate-x-full');

    return (
        <aside className={`fixed top-0 bottom-0 ${lang === 'ar' ? 'right-0' : 'left-0'} w-64 bg-white border-${lang === 'ar' ? 'l' : 'r'} border-gray-100 flex flex-col z-50 transition-transform duration-300 md:translate-x-0 ${transformClass} shadow-2xl md:shadow-none`}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setRole('pilgrim')}>
                    <div className="w-10 h-10 bg-emerald-800 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                        <Navigation size={20} />
                    </div>
                    <div>
                        <span className="text-lg font-bold text-emerald-900">{lang === 'ar' ? 'تلبية' : 'Talbia'}</span>
                        <span className="text-amber-600 font-bold">{lang === 'ar' ? 'مزارات' : 'Mazar'}</span>
                        <div className="text-[10px] text-gray-400 font-medium uppercase">Transporter Panel</div>
                    </div>
                </div>
                <button onClick={onClose} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {menu.map(m => (
                    <button key={m.id} onClick={() => { setActive(m.id); if (onClose) onClose(); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active === m.id ? 'bg-emerald-50 text-emerald-800' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <m.icon size={20} />{t[m.id]}
                    </button>
                ))}
            </nav>
            <div className="p-4 border-t border-gray-100">
                <button onClick={() => setRole('pilgrim')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 mb-2">
                    <Globe size={20} />{t.backHome}
                </button>
                <button onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.reload();
                }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut size={20} />{t.logout}
                </button>
            </div>
        </aside>
    );
};

const OffersSection = ({ t, lang, user }) => {
    const [offers, setOffers] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState({ open: false, data: null });
    const [formData, setFormData] = useState({ route_id: '', vehicle_type: 'car', price_total: '' });

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        const [routesData, offersData] = await Promise.all([
            tripService.getRoutes(),
            supabase.from('transporter_offers').select('*, route:route_id(*)').eq('transporter_id', user.id)
        ]);
        setRoutes(routesData || []);
        setOffers(offersData.data || []);
    };

    const handleSave = async () => {
        if (!formData.route_id || !formData.price_total) return toast.error('Please fill required fields');
        setLoading(true);
        try {
            const payload = {
                transporter_id: user.id,
                route_id: formData.route_id,
                vehicle_type: formData.vehicle_type,
                price_total: parseFloat(formData.price_total),
                is_active: true
            };
            if (modal.data?.id) {
                await supabase.from('transporter_offers').update(payload).eq('id', modal.data.id);
                toast.success('Offer updated');
            } else {
                await supabase.from('transporter_offers').insert([payload]);
                toast.success('Offer added');
            }
            setModal({ open: false, data: null });
            loadData();
        } catch (e) {
            toast.error(e.message);
        }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm(t.confirmDelete)) return;
        try {
            await supabase.from('transporter_offers').delete().eq('id', id);
            toast.success('Offer deleted');
            loadData();
        } catch (e) {
            toast.error(e.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">{t.offers}</h2>
                <button onClick={() => { setFormData({ route_id: '', vehicle_type: 'car', price_total: '' }); setModal({ open: true, data: null }); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-800 text-white rounded-xl text-sm font-bold">
                    <Plus size={16} />{t.addOffer}
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {offers.map(offer => (
                    <div key={offer.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">{offer.route?.title}</h3>
                                <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                    {offer.vehicle_type === 'bus' ? <Bus size={14} /> : <Car size={14} />}
                                    {t[offer.vehicle_type] || offer.vehicle_type}
                                </div>
                            </div>
                            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">
                                {offer.is_active ? t.active : t.status}
                            </span>
                        </div>
                        <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                            <span className="font-bold text-emerald-800 text-xl">{offer.price_total} <span className="text-sm text-gray-500">{t.currency}</span></span>
                            <div className="flex gap-2">
                                <button onClick={() => { setFormData(offer); setModal({ open: true, data: offer }); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit size={16} /></button>
                                <button onClick={() => handleDelete(offer.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    </div>
                ))}
                {offers.length === 0 && <div className="col-span-full py-10 text-center text-gray-400">{t.noData}</div>}
            </div>

            <Modal isOpen={modal.open} onClose={() => setModal({ open: false, data: null })} title={modal.data ? t.editOffer : t.addOffer}>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-2 block">{t.selectRoute}</label>
                        <select value={formData.route_id} onChange={e => setFormData({ ...formData, route_id: e.target.value })} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50">
                            <option value="">--</option>
                            {routes.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-2 block">{t.vehicleType}</label>
                        <select value={formData.vehicle_type} onChange={e => setFormData({ ...formData, vehicle_type: e.target.value })} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50">
                            <option value="car">{t.car}</option>
                            <option value="bus">{t.bus}</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-2 block">{t.price}</label>
                        <input type="number" value={formData.price_total} onChange={e => setFormData({ ...formData, price_total: e.target.value })} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button onClick={() => setModal({ open: false, data: null })} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">{t.cancel}</button>
                        <button onClick={handleSave} disabled={loading} className="flex-1 py-3 bg-emerald-800 text-white rounded-xl font-bold">{loading ? t.loading : t.save}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const BookingsSection = ({ t, lang, user }) => {
    const [bookings, setBookings] = useState([]);
    
    useEffect(() => {
        if (user) loadData();
    }, [user]);

    const loadData = async () => {
        const { data } = await tripService.getTransporterBookings(user.id);
        setBookings(data || []);
    };

    const updateStatus = async (id, status) => {
        try {
            await supabase.from('trip_bookings').update({ status }).eq('id', id);
            toast.success('Status updated');
            loadData();
        } catch (e) {
            toast.error(e.message);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">{t.bookings}</h2>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                        <tr>
                            <th className="px-4 py-3 text-start">ID</th>
                            <th className="px-4 py-3 text-start">{t.client}</th>
                            <th className="px-4 py-3 text-start">{t.route}</th>
                            <th className="px-4 py-3 text-start">{t.date}</th>
                            <th className="px-4 py-3 text-center">{t.price}</th>
                            <th className="px-4 py-3 text-center">{t.status}</th>
                            <th className="px-4 py-3 text-center">{t.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {bookings.map(b => (
                            <tr key={b.id}>
                                <td className="px-4 py-3 font-mono text-xs">{b.id.slice(0,8)}</td>
                                <td className="px-4 py-3">
                                    <div className="font-bold">{b.pilgrim?.full_name || 'Guest'}</div>
                                    <div className="text-xs text-gray-500">{b.pilgrim?.phone}</div>
                                </td>
                                <td className="px-4 py-3 font-medium">{b.offer?.route?.title}</td>
                                <td className="px-4 py-3 text-sm">
                                    <div>{b.trip_date}</div>
                                    <div className="text-xs text-gray-500">{b.passengers_count} {t.passengers}</div>
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-emerald-800">{b.total_price} {t.currency}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${b.status === 'paid' ? 'bg-green-100 text-green-700' : (b.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700')}`}>
                                        {t[b.status] || b.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {b.status === 'paid' && (
                                        <button onClick={() => updateStatus(b.id, 'completed')} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100">
                                            ✔ {lang === 'ar' ? 'إنهاء الرحلة' : 'Complete'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {bookings.length === 0 && <tr><td colSpan="7" className="text-center py-10 text-gray-400">{t.noData}</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const FinanceSection = ({ t, lang, user }) => {
    // This connects to transporter_payouts logic
    const [payouts, setPayouts] = useState([]);
    const [stats, setStats] = useState({ total_earnings: 0, platform_fee: 0, net_profit: 0 });

    useEffect(() => {
        if (user) loadData();
    }, [user]);

    const loadData = async () => {
        const { data } = await supabase.from('transporter_payouts').select('*').eq('transporter_id', user.id).order('created_at', { ascending: false });
        if (data) {
            setPayouts(data);
            const total = data.reduce((acc, curr) => acc + curr.total_amount, 0);
            const fee = data.reduce((acc, curr) => acc + curr.platform_fee, 0);
            const net = data.reduce((acc, curr) => acc + curr.net_amount, 0);
            setStats({ total_earnings: total, platform_fee: fee, net_profit: net });
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">{t.finance}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="text-sm text-gray-500 mb-2">{t.totalEarnings}</div>
                    <div className="text-3xl font-black text-gray-900">{stats.total_earnings.toLocaleString()} <span className="text-sm font-medium">{t.currency}</span></div>
                </div>
                <div className="bg-red-50 rounded-2xl p-6 border border-red-100 shadow-sm">
                    <div className="text-sm text-red-600 mb-2">{lang === 'ar' ? 'عمولة المنصة' : 'Platform Fee'}</div>
                    <div className="text-3xl font-black text-red-700">{stats.platform_fee.toLocaleString()} <span className="text-sm font-medium">{t.currency}</span></div>
                </div>
                <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 shadow-sm">
                    <div className="text-sm text-emerald-800 mb-2">{t.netProfit}</div>
                    <div className="text-3xl font-black text-emerald-700">{stats.net_profit.toLocaleString()} <span className="text-sm font-medium">{t.currency}</span></div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mt-6">
                <table className="w-full">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                        <tr>
                            <th className="px-4 py-3 text-start">ID / Booking</th>
                            <th className="px-4 py-3 text-center">{t.totalEarnings}</th>
                            <th className="px-4 py-3 text-center">Fee</th>
                            <th className="px-4 py-3 text-center">{t.netProfit}</th>
                            <th className="px-4 py-3 text-center">{t.status}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {payouts.map(p => (
                            <tr key={p.id}>
                                <td className="px-4 py-3 text-sm font-mono text-gray-500">{p.id.slice(0,8)}</td>
                                <td className="px-4 py-3 text-center font-bold text-gray-900">{p.total_amount}</td>
                                <td className="px-4 py-3 text-center text-red-500">-{p.platform_fee}</td>
                                <td className="px-4 py-3 text-center font-bold text-emerald-700">{p.net_amount}</td>
                                <td className="px-4 py-3 text-center"><span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold">{p.payout_status}</span></td>
                            </tr>
                        ))}
                        {payouts.length === 0 && <tr><td colSpan="5" className="text-center py-10 text-gray-400">{t.noData}</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default function PartnerPanel({ lang, setRole, user }) {
    const t = T[lang] || T['en'];
    const [activeTab, setActiveTab] = useState('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const renderContent = () => {
        switch (activeTab) {
            case 'offers': return <OffersSection t={t} lang={lang} user={user} />;
            case 'bookings': return <BookingsSection t={t} lang={lang} user={user} />;
            case 'finance': return <FinanceSection t={t} lang={lang} user={user} />;
            default: return (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">{t.overview}</h2>
                    <div className="bg-emerald-50 text-emerald-900 p-8 rounded-3xl text-center border border-emerald-100">
                        <Navigation size={48} className="mx-auto mb-4 opacity-50" />
                        <h3 className="text-2xl font-black mb-2">{lang === 'ar' ? 'مرحباً بك في لوحة تحكم النواقل' : 'Welcome to Transporter Dashboard'}</h3>
                        <p className="text-emerald-700">{lang === 'ar' ? 'يمكنك هنا إدارة عروض مساراتك ومتابعة حجوزات المعتمرين وأرباحك بسهولة.' : 'Manage your route offers, track pilgrim bookings, and view earnings easily.'}</p>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 flex" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <Sidebar active={activeTab} setActive={setActiveTab} lang={lang} setRole={setRole} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            
            <div className={`flex-1 flex flex-col transition-all duration-300 ${lang === 'ar' ? 'md:mr-64' : 'md:ml-64'}`}>
                {/* Topbar for mobile */}
                <div className="md:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-40">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-800 rounded-lg flex items-center justify-center text-white"><Navigation size={16} /></div>
                        <span className="font-bold text-emerald-900">Talbia Transporter</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-50 rounded-lg"><LayoutDashboard size={20} /></button>
                </div>
                
                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    {renderContent()}
                </main>
            </div>
            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}
        </div>
    );
}
