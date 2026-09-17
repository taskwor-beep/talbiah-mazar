import React, { useState, useEffect, useMemo, useRef } from 'react';
import logo from './assets/logo.png';
import {
  Search, MapPin, Calendar as CalendarIcon, User, Star, Check, Copy,
  Menu, X, Heart, Share2, ChevronDown,
  TrendingUp, Shield, DollarSign, Briefcase,
  LayoutGrid, Users, Settings, LogOut, BedDouble,
  Coffee, ArrowRight, Bell, ChevronLeft, ChevronRight,
  Clock, Flame, Sliders, Phone, Car,
  CreditCard, CheckCircle, AlertCircle, Globe, Lock, Mail, Eye, EyeOff,
  Image as ImageIcon, Upload, FileText, MoreHorizontal, MessageCircle, Send, Bus, Navigation,
  BarChart3, Megaphone, Wallet, Ban, BadgeCheck, Filter, Download, Plus, Trash2, Edit,
  LayoutDashboard, Hotel, HelpCircle, MessageSquare, ToggleLeft, ToggleRight,
  Tag, Calendar, CalendarCheck, FileBadge
} from 'lucide-react';

import { supabase } from './lib/supabase';

import { authService } from './services/authService';
import { hotelService } from './services/hotelService';
import { bookingService } from './services/bookingService';
import { reviewService } from './services/reviewService';
import { useBanners } from './hooks/useBanners';
import { commonService } from './services/commonService';
import { pilgrimService } from './services/pilgrimService';
import { usePresence } from './hooks/usePresence';

import { useUserProfile } from './hooks/useUserProfile';
import { useFavorites } from './hooks/useFavorites';
import { generateBookingPdf } from './services/pdfService';
import { calculatePrice, calculateFirstNightPrice } from './utils/pricing';

import AdminPanel from './AdminPanel';
import PartnerPanel from './PartnerPanel';
import PilgrimPanel from './PilgrimPanel';
import VoucherTemplate from './components/VoucherTemplate';
import CustomPageViewer from './components/CustomPageViewer';
import HotelMapViewer from './components/HotelMapViewer';
import OfferCard from './components/OfferCard';
import TripDetails from './components/TripDetails';
import { DataProvider } from './context/DataContext';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/react-query';
import { useDebounce } from './hooks/useDebounce';
import { useSearchOffers } from './hooks/useSearchOffers';
import { useOfferPilgrims } from './hooks/useOfferPilgrims';
import { useBookings } from './hooks/useBookings';
import { useFeaturedOffers } from './hooks/useFeaturedOffers';
import { Toaster, toast } from 'react-hot-toast';

// --- Font Injection & Global Styles ---
const GlobalStyles = () => (
  <style>{`
    /* Global Styles */
    body {
      font-family: 'Tajawal', sans-serif;
    }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

// --- Translations ---
const TRANSLATIONS = {
  ar: {
    // General
    appTitle: 'تلبية',
    appSubTitle: 'تسكين',
    login: 'تسجيل الدخول',
    logout: 'خروج',
    backHome: 'العودة للرئيسية',
    adminButton: 'إدارة',
    partnerButton: 'لوحة الفندق',
    help: 'مساعدة',
    // Dashboard Menu
    dashboard: 'لوحة القيادة',
    offers: 'العروض والحجوزات',
    partners: 'الفنادق والشركاء',
    finance: 'المالية والسحب',
    marketing: 'الترويج والمحتوى',
    insights: 'التحليلات',
    settings: 'الإعدادات',
    // Partner Specific
    p_overview: 'الرئيسية',
    p_rooms: 'إدارة الغرف',
    p_offers: 'العروض',
    p_bookings: 'الحجوزات',
    p_chat: 'التواصل',
    p_finance: 'المالية',
    p_profile: 'الملف والتوثيق',
    currentBookings: 'الحجوزات الحالية',
    bedsLeft: 'الأسرة المتبقية',
    expectedIncome: 'الدخل المتوقع',
    occupancyRate: 'نسبة الإشغال',
    roomTypeLabel: 'نوع الغرفة',
    totalBeds: 'العدد الكلي',
    availBeds: 'المتاح',
    roomStatus: 'حالة الغرفة',
    editRoom: 'تعديل الغرفة',
    createOffer: 'إنشاء عرض جديد',
    offerPrice: 'سعر العرض',
    originalPrice: 'السعر الأصلي',
    discount: 'خصم',
    dates: 'التواريخ',
    guestName: 'اسم المعتمر',
    bookingStatus: 'حالة الحجز',
    totalEarnings: 'إجمالي الدخل',
    platformFee: 'عمولة المنصة',
    netProfit: 'المستحقات',
    withdraw: 'سحب الأرباح',
    // Admin Stats
    bookingsToday: 'حجوزات اليوم',
    totalRevenue: 'إجمالي المدفوعات',
    pendingOffers: 'عروض للمراجعة',
    payoutRequests: 'طلبات سحب',
    activeHotels: 'فنادق نشطة',
    // Shared Lists/Actions
    id: 'المعرف',
    hotel: 'الفندق',
    room: 'الغرفة',
    price: 'السعر',
    status: 'الحالة',
    actions: 'إجراءات',
    date: 'التاريخ',
    amount: 'المبلغ',
    commission: 'العمولة',
    verification: 'التوثيق',
    // Actions
    approve: 'قبول',
    reject: 'رفض',
    suspend: 'تعليق',
    edit: 'تعديل',
    delete: 'حذف',
    view: 'عرض',
    reason: 'سبب الرفض / التعليق',
    confirmAction: 'تأكيد الإجراء',
    cancel: 'إلغاء',
    // Statuses
    pending: 'قيد المراجعة',
    approved: 'مقبول',
    rejected: 'مرفوض',
    verified_gold: 'ذهبي',
    verified_blue: 'أزرق',
    unverified: 'غير موثق',
    paid: 'تم الدفع',
    processing: 'قيد المعالجة',
    confirmed: 'مؤكد',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    // Marketing
    banners: 'البنرات الإعلانية',
    pushNotif: 'إشعارات جماعية',
    sendNotif: 'إرسال إشعار',
    // Finance
    balance: 'رصيد المنصة',
    hotelDues: 'مستحقات الفنادق',
    // Insights
    searchStats: 'إحصائيات البحث',
    // Alerts
    alert_doc: 'عرض غير موثق',
    alert_suspend: 'فندق موقوف',
    alert_payout: 'طلب سحب عالي القيمة',
    // User App Specific
    search: 'بحث',
    dest: 'الوجهة',
    guests: 'الضيوف',
    makkah: 'مكة المكرمة',
    madinah: 'المدينة المنورة',
    fullRoom: 'غرفة كاملة',
    bedOnly: 'سرير فقط',
    budget: 'الميزانية (الحد الأقصى)',
    currency: 'د.ج',
    night: 'ليلة',
    recommended: 'أفضل الإقامات الموصى بها',
    resultsFound: 'تم العثور على {count} عقار',
    noResults: 'لا توجد نتائج',
    tryChanging: 'جرب تغيير معايير البحث أو المدينة',
    resetFilters: 'إعادة تعيين الفلاتر',
    bookNow: 'احجز الآن',
    details: 'التفاصيل',
    about: 'عن المكان',
    reviews: 'تقييم',
    amenities: 'المرافق',
    roommates: 'شركاء الغرفة',
    verifiedGuests: 'حجاج موثقون',
    chatWith: 'تحدث مع',
    whatsappTitle: 'الدعم عبر واتساب',
    whatsappMsg: 'السلام عليكم، أود الاستفسار عن الحجز...',
    send: 'إرسال',
    clearDates: 'مسح التواريخ',
    selectDates: 'اختر التواريخ',
    nights: 'ليالي',
    summary: 'ملخص الطلب',
    payment: 'إتمام الدفع',
    total: 'الإجمالي',
    taxes: 'الضرائب والرسوم',
    nightPrice: 'سعر الليلة',
    welcomeBack: 'مرحباً بعودتك',
    createAccount: 'إنشاء حساب جديد',
    loginDesc: 'سجل الدخول للمتابعة في رحلتك الروحانية.',
    registerDesc: 'انضم إلينا لتجربة حجز عمرة سلسة وموثوقة.',
    name: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    uploadPhoto: 'صورة شخصية',
    or: 'أو',
    continueGoogle: 'المتابعة باستخدام Google',
    noAccount: 'ليس لديك حساب؟',
    haveAccount: 'لديك حساب بالفعل؟',
    registerNow: 'سجل الآن',
    loginVerb: 'سجل الدخول',
    // Pilgrim Dashboard
    myTrips: 'رحلاتي',
    chat: 'محادثة',
    saved: 'المحفوظات',
    paymentHistory: 'سجل المدفوعات',
    profile: 'الملف الشخصي',
    support: 'الدعم',
    upcomingTrips: 'الرحلات القادمة',
    pastTrips: 'الأرشيف',
    compatibility: 'توافق',
    privacySettings: 'إعدادات الخصوصية',
    hideName: 'إخفاء الاسم الكامل',
    hidePhoto: 'إخفاء الصورة الشخصية',
    bio: 'نبذة عني',
    faqs: 'الأسئلة الشائعة',
    contactSupport: 'تواصل مع الدعم',
    noBookings: 'لا توجد حجوزات نشطة حالياً',
    waitingPayment: 'بانتظار الدفع',
    roomDetails: 'تفاصيل الغرفة',
    messageSent: 'تم إرسال الرسالة بنجاح',
    partialBooking: 'حجز جزئي فقط',
    partialDesc: 'الحجز الكامل غير متاح. متبقي عدد محدود من الأسرة.',
    location: 'الموقع',
    routeToHotel: 'مسار إلى الفندق',
    routeToHaram: 'مسار إلى الحرم',
    interactiveMap: 'خريطة تفاعلية',
    uploadDocs: 'رفع المستندات',
    hotelName: 'اسم الفندق',
    city: 'المدينة',
    verificationStatus: 'حالة التوثيق',

    roomOptions: {
      single: 'غرفة مفردة',
      double: 'ثنائية (2)',
      triple: 'ثلاثية (3)',
      quad: 'رباعية (4)',
      quint: 'خماسية (5)',
      all: 'الكل'
    },
    filterTabs: ['موصى به', 'أقل سعر', 'الأقرب للحرم', 'أضيف حديثاً'],
    months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    daysShort: ['أح', 'إث', 'ث', 'أر', 'خم', 'ج', 'س']
  },
  en: {
    // General
    appTitle: 'Talbia',
    appSubTitle: 'Taskin',
    login: 'Login',
    logout: 'Logout',
    backHome: 'Back to Home',
    adminButton: 'Admin',
    partnerButton: 'Hotel Panel',
    help: 'Help',
    // Dashboard Menu
    dashboard: 'Dashboard',
    offers: 'Offers & Bookings',
    partners: 'Hotels & Partners',
    finance: 'Finance & Payouts',
    marketing: 'Marketing',
    insights: 'Insights',
    settings: 'Settings',
    // Partner Specific
    p_overview: 'Overview',
    p_rooms: 'Rooms',
    p_offers: 'Offers',
    p_bookings: 'Bookings',
    p_chat: 'Chat',
    p_finance: 'Finance',
    p_profile: 'Profile & Docs',
    currentBookings: 'Current Bookings',
    bedsLeft: 'Beds Left',
    expectedIncome: 'Expected Income',
    occupancyRate: 'Occupancy Rate',
    roomTypeLabel: 'Room Type',
    totalBeds: 'Total Beds',
    availBeds: 'Available',
    roomStatus: 'Status',
    editRoom: 'Edit Room',
    createOffer: 'Create Offer',
    offerPrice: 'Price',
    originalPrice: 'Original Price',
    discount: 'Discount',
    dates: 'Dates',
    guestName: 'Guest Name',
    bookingStatus: 'Status',
    totalEarnings: 'Total Earnings',
    platformFee: 'Platform Fee',
    netProfit: 'Net Profit',
    withdraw: 'Withdraw Funds',
    // Admin Stats
    bookingsToday: "Today's Bookings",
    totalRevenue: 'Total Revenue',
    pendingOffers: 'Pending Offers',
    payoutRequests: 'Payout Requests',
    activeHotels: 'Active Hotels',
    // Shared
    id: 'ID',
    hotel: 'Hotel',
    room: 'Room',
    price: 'Price',
    status: 'Status',
    actions: 'Actions',
    date: 'Date',
    amount: 'Amount',
    commission: 'Commission',
    verification: 'Verification',
    approve: 'Approve',
    reject: 'Reject',
    suspend: 'Suspend',
    edit: 'Edit',
    delete: 'Delete',
    view: 'View',
    reason: 'Reason',
    confirmAction: 'Confirm',
    cancel: 'Cancel',
    // Statuses
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    verified_gold: 'Gold',
    verified_blue: 'Blue',
    unverified: 'Unverified',
    paid: 'Paid',
    processing: 'Processing',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
    // Marketing
    banners: 'Banners',
    addBanner: 'Add Banner',
    featuredOffers: 'Featured Offers',
    pushNotif: 'Push Notifications',
    sendNotif: 'Send Notification',
    // Finance
    balance: 'Platform Balance',
    hotelDues: 'Hotel Dues',
    // Insights
    mostViewed: 'Most Viewed',
    demandCurve: 'Demand Curve',
    searchStats: 'Search Stats',
    // Alerts
    alert_doc: 'Unverified Offer',
    alert_suspend: 'Suspended Hotel',
    alert_payout: 'High Value Payout',
    // User App
    search: 'Search',
    dest: 'Destination',
    guests: 'Guests',
    makkah: 'Makkah',
    madinah: 'Madinah',
    fullRoom: 'Full Room',
    bedOnly: 'Bed Only',
    budget: 'Budget (Max)',
    currency: 'DZD',
    night: 'night',
    recommended: 'Recommended',
    resultsFound: 'Found {count} properties',
    noResults: 'No results found',
    tryChanging: 'Try changing filters',
    resetFilters: 'Reset Filters',
    bookNow: 'Book Now',
    details: 'Details',
    about: 'About',
    reviews: 'reviews',
    amenities: 'Amenities',
    roommates: 'Roommates',
    verifiedGuests: 'Verified Guests',
    chatWith: 'Chat with',
    whatsappTitle: 'WhatsApp Support',
    whatsappMsg: 'Hello, I have a question...',
    send: 'Send',
    clearDates: 'Clear Dates',
    confirm: 'Confirm',
    selectDates: 'Select Dates',
    nights: 'nights',
    summary: 'Summary',
    payment: 'Payment',
    total: 'Total',
    taxes: 'Taxes',
    nightPrice: 'Night Price',
    welcomeBack: 'Welcome Back',
    createAccount: 'Create Account',
    loginDesc: 'Login to continue',
    registerDesc: 'Join us today',
    name: 'Full Name',
    email: 'Email',
    password: 'Password',
    uploadPhoto: 'Photo',
    or: 'OR',
    continueGoogle: 'Continue with Google',
    haveAccount: 'Have an account?',
    noAccount: 'No account?',
    registerNow: 'Register',
    loginVerb: 'Login',

    // Pilgrim Dashboard
    myTrips: 'Trips',
    chat: 'Chat',
    saved: 'Saved',
    paymentHistory: 'Payments',
    profile: 'Profile',
    support: 'Support',
    upcomingTrips: 'Upcoming',
    pastTrips: 'History',
    compatibility: 'Compatibility',
    privacySettings: 'Privacy Settings',
    hideName: 'Hide Name',
    hidePhoto: 'Hide Photo',
    bio: 'Bio',
    faqs: 'FAQs',
    contactSupport: 'Support',
    noBookings: 'No bookings',
    waitingPayment: 'Waiting Payment',
    roomDetails: 'Room Details',
    messageSent: 'Message sent',
    partialBooking: 'Partial Booking',
    partialDesc: 'Limited beds available',
    location: 'Location',
    routeToHotel: 'To Hotel',
    routeToHaram: 'To Haram',
    interactiveMap: 'Interactive Map',
    uploadDocs: 'Upload Docs',
    hotelName: 'Hotel Name',
    city: 'City',
    verificationStatus: 'Verification Status',

    roomOptions: {
      single: 'Single',
      double: 'Double (2)',
      triple: 'Triple (3)',
      quad: 'Quad (4)',
      quint: 'Quint (5)',
      all: 'All'
    },
    filterTabs: ['Recommended', 'Lowest Price', 'Closest to Haram', 'Newest'],
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    daysShort: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  }
};

// --- Theme & Configuration ---
const THEME = {
  colors: {
    primary: 'bg-emerald-800',
    primaryText: 'text-emerald-800',
    primaryHover: 'hover:bg-emerald-900',
    accent: 'text-amber-600',
    bg: 'bg-stone-50',
    card: 'bg-white',
    textMain: 'text-gray-900',
    textMuted: 'text-gray-500',
    border: 'border-gray-200',
  },
};

// --- Mock Data Removed (Strict Supabase Integration) ---
const HOTELS = [];
const BANNERS_DATA = {};
const PILGRIM_DATA = {};
const ADMIN_DATA = {};
const PARTNER_DATA = {};

// --- Helper Functions ---
const useTranslation = (lang) => {
  const t = (key, params = {}) => {
    let text = key.split('.').reduce((obj, k) => (obj || {})[k], TRANSLATIONS[lang]);
    if (!text) return key;
    if (typeof text === 'string') {
      Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
      });
    }
    return text;
  };
  return t;
};

// --- SHARED Components ---

const StatCard = ({ title, value, sub, trend, positive, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-700`}>
        <Icon size={24} className={`text-${color.replace('bg-', '').replace('100', '600')}`} />
      </div>
      {trend && (
        <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${positive === false ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          <TrendingUp size={12} /> {trend}
        </span>
      )}
    </div>
    <div>
      <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {sub && <p className="text-gray-400 text-xs mt-2">{sub}</p>}
    </div>
  </div>
);

const HomeBanner = ({ lang }) => {
  const [promoIndex, setPromoIndex] = useState(0);
  // Use useBanners hook with caching
  const { data: banners = [] } = useBanners();

  const seasonBanner = banners.find(b => b.type === 'season') || { is_active: false };
  const promoBanners = banners.filter(b => b.type === 'promo') || [];

  // Helper for localized text
  const getText = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj['en'] || '';
  };

  // Auto-rotate promo banners
  React.useEffect(() => {
    if (promoBanners.length <= 1) return;
    const timer = setInterval(() => {
      setPromoIndex(prev => (prev + 1) % promoBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [promoBanners.length]);

  if (!seasonBanner.is_active && promoBanners.length === 0) return null;

  return (
    <div className="pt-20 pb-4">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Season Banner */}
        {seasonBanner.is_active && (
          <div className="relative overflow-hidden rounded-3xl mb-4 group">
            <img src={seasonBanner.image_url} alt="" className="w-full h-48 md:h-64 object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/80 via-emerald-900/60 to-emerald-900/80" />
            <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-6">
              <span className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full mb-3">{lang === 'ar' ? 'موسم رمضان' : 'Ramadan Season'}</span>
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-2">{getText(seasonBanner.title)}</h2>
              <p className="text-white/80 text-sm md:text-base max-w-md mb-4">{getText(seasonBanner.description)}</p>
              {seasonBanner.action_url && (
                <button className="px-6 py-3 bg-white text-emerald-800 font-bold rounded-xl hover:bg-emerald-50 transition-colors shadow-lg">
                  {seasonBanner.buttonText[lang]}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Promo Banner Slider */}
        {promoBanners.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl">
            <div className="relative h-32 md:h-40">
              {promoBanners.map((promo, i) => (
                <div key={promo.id} className={`absolute inset-0 transition-all duration-500 ${i === promoIndex ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
                  <img src={promo.image_url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className={`absolute inset-0 flex items-center justify-center p-6 mt-12`}>
                    <div className="text-center w-full max-w-lg flex flex-col items-center">
                      <h3 className="text-lg md:text-2xl font-bold text-white mb-2">{getText(promo.title)}</h3>
                      {getText(promo.description) && (
                        <p className="text-white/80 text-sm md:text-base mb-4 drop-shadow-md">{getText(promo.description)}</p>
                      )}

                      {/* Optional Action Button */}
                      {(promo.link || promo.action_url) && (
                        <button
                          onClick={() => window.location.href = promo.link || promo.action_url}
                          className="px-6 py-2 bg-white text-emerald-800 text-sm font-bold rounded-xl hover:bg-emerald-50 transition-colors shadow-lg mt-2 inline-flex items-center gap-2"
                        >
                          {lang === 'ar' ? 'عرض المزيد' : 'View More'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Dots Indicator */}
            {promoBanners.length > 1 && (
              <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2">
                {promoBanners.map((_, i) => (
                  <button key={i} onClick={() => setPromoIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === promoIndex ? 'bg-white w-6' : 'bg-white/50'}`} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const SettingsToggle = ({ label, checked, onChange, t }) => (
  <div className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <button onClick={() => onChange(!checked)} className={`text-2xl transition-colors ${checked ? 'text-emerald-600' : 'text-gray-300'}`}>
      {checked ? <ToggleRight size={32} fill="currentColor" /> : <ToggleLeft size={32} />}
    </button>
  </div>
);

const ActionModal = ({ isOpen, onClose, type, item, t }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">{type === 'approve' ? t('approve') : type === 'edit' ? t('edit') : t('reject')}</h3>
          <button onClick={onClose}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100">
          <div className="font-bold text-gray-900">{item.name || item.hotel || item.guest}</div>
          <div className="text-xs text-gray-500">{item.type || item.room}</div>
        </div>
        {(type === 'reject' || type === 'suspend') && (
          <div className="mb-4">
            <label className="text-xs font-bold text-gray-700 mb-2 block">{t('reason')}</label>
            <textarea className="w-full border border-gray-200 rounded-xl p-3 text-sm h-20 bg-gray-50 outline-none focus:ring-2 focus:ring-red-100"></textarea>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">{t('cancel')}</button>
          <button onClick={() => { toast.error('Action Confirmed'); onClose(); }} className={`flex-1 text-white py-3 rounded-xl font-bold ${type === 'reject' || type === 'suspend' ? 'bg-red-600' : 'bg-emerald-800'}`}>{t('confirmAction')}</button>
        </div>
      </div>
    </div>
  );
};

const RoomCard = ({ hotel, lang, onClick, isFavorite, onToggleFavorite }) => {
  const [currentImage, setCurrentImage] = useState(0);
  const offerPilgrims = hotel.pilgrims || [];
  const t = useTranslation(lang);

  const images = hotel.images || [];
  const name = typeof hotel.name === 'object' ? (hotel.name[lang] || hotel.name['en']) : hotel.name;

  const nextImage = (e) => { e.stopPropagation(); if (images.length > 1) setCurrentImage((prev) => (prev + 1) % images.length); };
  const prevImage = (e) => { e.stopPropagation(); if (images.length > 1) setCurrentImage((prev) => (prev - 1 + images.length) % images.length); };

  return (
    <div onClick={onClick} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 overflow-hidden flex flex-col cursor-pointer" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="relative aspect-[4/3] bg-gray-200 overflow-hidden">
        <img src={images[currentImage] || '/placeholder.jpg'} alt={name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        {images.length > 1 && (
          <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={lang === 'ar' ? nextImage : prevImage} className="p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-sm backdrop-blur-sm transition-all z-10">{lang === 'ar' ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
            <button onClick={lang === 'ar' ? prevImage : nextImage} className="p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-sm backdrop-blur-sm transition-all z-10">{lang === 'ar' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}</button>
          </div>
        )}
        {hotel.originalPrice && hotel.price < hotel.originalPrice && Math.round((1 - hotel.price / hotel.originalPrice) * 100) > 0 && (
          <div className={`absolute top-3 ${lang === 'ar' ? 'right-3' : 'left-3'} bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-lg`}>
            {lang === 'ar' ? 'خصم' : 'SALE'} {Math.round((1 - hotel.price / hotel.originalPrice) * 100)}%
          </div>
        )}
        {/* Bed Availability Badge - Only when searching by bed type + dates */}
        {hotel._showBedInfo && hotel.bedsAvailable !== undefined && hotel.capacity && (
          <div className={`absolute top-3 ${lang === 'ar' ? 'left-12' : 'right-12'} ${hotel.isFullyBooked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'} px-2 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1`}>
            <BedDouble size={12} />
            {hotel.isFullyBooked
              ? (lang === 'ar' ? 'مكتمل' : 'Full')
              : (lang === 'ar' ? `${hotel.bedsAvailable} سرير متبقي` : `${hotel.bedsAvailable} beds left`)
            }
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('Heart clicked on offer:', hotel.offerId || hotel.id);
            onToggleFavorite && onToggleFavorite(hotel.offerId || hotel.id);
          }}
          className={`absolute top-3 ${lang === 'ar' ? 'left-3' : 'right-3'} p-2 rounded-full bg-white/80 hover:bg-white shadow-sm backdrop-blur-md transition-all z-20 hover:scale-110 active:scale-95 ${isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
        >
          <Heart size={18} className={isFavorite ? "fill-current" : ""} />
        </button>
        <div className={`absolute bottom-3 ${lang === 'ar' ? 'left-3 items-end' : 'right-3 items-start'} bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg border border-gray-100 flex flex-col`}>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-emerald-700 text-lg">{hotel.price} {t('currency')}</span>
            {hotel.originalPrice && (
              <span className="text-sm text-gray-400 line-through">{hotel.originalPrice}</span>
            )}
            <span className="text-[10px] text-gray-500 font-medium">/{t('night')}</span>
          </div>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{name}</h3>
        <div className="flex items-center gap-1.5 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={12} className={i < (hotel.rating || 0) ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"} />
          ))}
          <span className="text-xs text-gray-500">({hotel.rating || 0})</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-3">
          <MapPin size={14} className="text-emerald-600" />
          <span>{hotel.distance} {lang === 'ar' ? 'عن الحرم' : 'to Haram'}</span>
        </div>
        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
          <div className="flex gap-2">
            {hotel.amenities?.slice(0, 3).map((am, i) => (
              <span key={i} className="px-2 py-1 bg-gray-50 rounded-md text-[10px] text-gray-500">{am}</span>
            ))}
          </div>
          {/* Pilgrim Avatars */}
          {offerPilgrims.length > 0 && (
            <div className="flex -space-x-2 rtl:space-x-reverse">
              {offerPilgrims.slice(0, 4).map((pilgrim, i) => {
                const isGuest = pilgrim?.name === 'Guest' || !pilgrim?.name;
                const initials = isGuest ? 'GU' : pilgrim.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

                return pilgrim?.avatar ? (
                  <img
                    key={pilgrim?.id || i}
                    src={pilgrim.avatar}
                    alt={pilgrim?.name || 'Guest'}
                    title={pilgrim?.name || 'Guest'}
                    className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-sm bg-white"
                  />
                ) : (
                  <div
                    key={pilgrim?.id || i}
                    title={pilgrim?.name || 'Guest'}
                    className="w-7 h-7 rounded-full border-2 border-white bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold shadow-sm"
                  >
                    {initials}
                  </div>
                );
              })}
              {offerPilgrims.length > 4 && (
                <div className="w-7 h-7 rounded-full border-2 border-white bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shadow-sm">
                  +{offerPilgrims.length - 4}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


const ChatModal = ({ isOpen, onClose, user: targetUser, currentUser, lang, isUserOnline, offerId }) => {
  console.log('[ChatModal] Render:', { isOpen, targetId: targetUser?.id, currentId: currentUser?.id, offerId });
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const t = useTranslation(lang);
  const scrollRef = useRef();

  // 1. Get/Create Conversation
  useEffect(() => {
    console.log('[ChatModal] Effect triggered. Target User:', targetUser?.id, 'Current User:', currentUser?.id);
    if (isOpen && targetUser && currentUser) {
      const setupChat = async () => {
        setLoading(true);
        try {
          let cid;
          if (offerId) {
            console.log('[ChatModal] Calling STRICT getOrCreateRoommateConversation for:', currentUser.id, targetUser.id, 'offer:', offerId);
            cid = await pilgrimService.getOrCreateRoommateConversation(currentUser.id, targetUser.id, offerId);
          } else {
            console.log('[ChatModal] Calling standard getOrCreateConversation for:', currentUser.id, targetUser.id);
            cid = await pilgrimService.getOrCreateConversation(currentUser.id, targetUser.id);
          }
          console.log('[ChatModal] cid result:', cid);
          setConversationId(cid);

          // Load existing
          const msgs = await pilgrimService.getMessages(cid);
          setMessages(msgs);
        } catch (e) {
          console.error("Chat setup failed", e);
          const errorMsg = typeof e === 'string' ? e : (e.message || e.error_description || JSON.stringify(e));
          if (errorMsg.includes('confirmed booking')) {
            toast.error(
              lang === 'ar'
                ? 'لا يمكنك بدء المحادثة مع المعتمرين حتى تقوم بتأكيد حجزك في هذا العرض.'
                : 'You cannot start a chat until you confirm your booking for this offer.',
              { duration: 5000, icon: '🔒' }
            );
          } else {
            toast.error(lang === 'ar' ? `خطأ في المحادثة: ${errorMsg}` : `Chat Error: ${errorMsg}`);
          }
        } finally {
          setLoading(false);
        }
      };
      setupChat();
    }
  }, [isOpen, targetUser?.id, currentUser?.id]);

  // 2. Realtime Subscription (Phase 2: Full Events)
  useEffect(() => {
    if (!conversationId) return;
    const sub = pilgrimService.subscribeToMessages(conversationId, (payload) => {
      const { eventType, new: newMsg, old: oldMsg } = payload;

      setMessages(prev => {
        if (eventType === 'INSERT') {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          // If incoming message, mark as read
          if (newMsg.sender_id !== currentUser?.id) {
            pilgrimService.markAsRead(conversationId, currentUser.id);
          }
          return [...prev, newMsg];
        }
        if (eventType === 'UPDATE') {
          return prev.map(m => m.id === newMsg.id ? newMsg : m);
        }
        if (eventType === 'DELETE') {
          return prev.filter(m => m.id !== oldMsg.id);
        }
        return prev;
      });
    });
    return () => sub.unsubscribe();
  }, [conversationId, currentUser?.id]);

  // Mark read on open
  useEffect(() => {
    if (conversationId && currentUser?.id && messages.length > 0) {
      pilgrimService.markAsRead(conversationId, currentUser.id);
    }
  }, [conversationId, currentUser?.id]); // Don't add messages dependency to avoid loop, just rely on initial open or specific triggers

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleDeleteMessage = async (msg) => {
    if (!confirm(lang === 'ar' ? 'حذف الرسالة؟' : 'Delete message?')) return;
    try {
      await pilgrimService.deleteMessage(msg.id);
      // Optimistic delete
      setMessages(prev => prev.filter(m => m.id !== msg.id));
    } catch (e) {
      console.error(e);
      toast.error(lang === 'ar' ? 'فشل الحذف (متاح فقط لمدة ساعة)' : 'Delete failed (only within 1 hour)');
    }
  };

  const [selectedMsgId, setSelectedMsgId] = useState(null);

  const handleSend = async () => {
    if (!message.trim() || !conversationId || !currentUser) return;

    // Play sound immediately
    playNotificationSound('send');

    try {
      const msgText = message;
      setMessage('');

      await pilgrimService.sendMessage(conversationId, currentUser.id, msgText);
    } catch (e) {
      console.error(e);
      toast.error(lang === 'ar' ? 'فشل إرسال الرسالة' : 'Failed to send message');
    }
  };

  if (!isOpen || !targetUser) return null;

  const isOnline = isUserOnline ? isUserOnline(targetUser.id) : false;
  const privacy = targetUser.privacy_settings || {};
  const displayName = privacy.hideName ? (lang === 'ar' ? 'فاعل خير' : 'Guest') : (targetUser.name || targetUser.full_name || 'User');
  const displayAvatar = privacy.hidePhoto ? null : (targetUser.avatar || targetUser.img || targetUser.avatar_url);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[500px]">
        {/* Header */}
        <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            {displayAvatar ? (
              <img src={displayAvatar} className="w-10 h-10 rounded-full border-2 border-white/20 object-cover" alt="" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20">
                <User size={20} className="text-white/80" />
              </div>
            )}
            <div>
              <div className="font-bold text-sm">{displayName}</div>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-200">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></span>
                {isOnline ? (lang === 'ar' ? 'متصل الآن' : 'Online') : (lang === 'ar' ? 'غير متصل' : 'Offline')}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 bg-gray-50 p-4 overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Loading chat...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-xs text-gray-400 my-8">
              {lang === 'ar' ? 'ابدأ المحادثة الآن' : 'Start the conversation now'}
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={msg.id || i}
                className={`flex flex-col ${msg.sender_id === currentUser?.id ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm relative group ${msg.sender_id === currentUser?.id
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-none'
                    }`}
                  onContextMenu={(e) => {
                    if (msg.sender_id === currentUser?.id) {
                      e.preventDefault();
                      // Toggle Delete Button
                      setSelectedMsgId(prev => prev === msg.id ? null : msg.id);
                    }
                  }}
                >
                  {msg.message}
                  {/* Delete Hint */}
                  {msg.sender_id === currentUser?.id && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg); }} className="hidden group-hover:block absolute -top-2 -left-2 bg-red-500 text-white rounded-full p-1 shadow-sm">
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
                {/* Read Receipt & Timestamp */}
                <div className="flex justify-end items-center gap-1 mt-1 px-1 min-h-[16px]">
                  <span className="text-[10px] text-gray-400">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.sender_id === currentUser?.id && (
                    <div className="flex items-center">
                      {msg.read_at
                        ? <div className="flex"><Check size={12} className="text-blue-500" /><Check size={12} className="text-blue-500 -ml-1.5" /></div> // Blue Double Check
                        : <Check size={12} className="text-gray-300" /> // Gray Check
                      }
                    </div>
                  )}
                </div>

                {/* Delete Prompt (Right Click) */}
                {selectedMsgId === msg.id && msg.sender_id === currentUser?.id && (
                  <div className="self-end mt-1 animate-in fade-in slide-in-from-top-1">
                    <button
                      onClick={() => handleDeleteMessage(msg)}
                      className="bg-red-50 text-red-600 text-xs px-3 py-1.5 rounded-lg border border-red-100 font-bold shadow-sm flex items-center gap-1 hover:bg-red-600 hover:text-white transition-colors"
                    >
                      <Trash2 size={12} /> {lang === 'ar' ? 'حذف الرسالة؟' : 'Delete?'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={lang === 'ar' ? 'اكتب رسالة...' : 'Type a message...'}
              className="flex-1 bg-gray-100 rounded-full py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className={`p-2.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:bg-gray-400`}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const WhatsAppModal = ({ isOpen, onClose, lang }) => {
  const t = useTranslation(lang);
  const [msg, setMsg] = useState(t('whatsappMsg'));
  const PHONE = '+213697953761';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-white w-full md:max-w-sm md:rounded-3xl rounded-t-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-[#25D366]"><Phone size={24} fill="currentColor" /><h3 className="font-bold text-gray-900">{t('whatsappTitle')}</h3></div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="text-center text-sm text-gray-500 mb-3 font-mono">{PHONE.replace('+213', '+213 ').replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4')}</div>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} className="w-full h-32 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#25D366]/20 outline-none resize-none"></textarea>
        <a href={`https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" onClick={onClose} className="w-full mt-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"><Send size={18} /> {t('send')}</a>
      </div>
    </div>
  );
};

const MapModal = ({ isOpen, onClose, hotel, lang }) => {
  const t = useTranslation(lang);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white animate-in fade-in zoom-in-95 duration-300 flex flex-col" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
        <button onClick={onClose} className="pointer-events-auto bg-white shadow-lg p-3 rounded-full text-gray-700 hover:bg-gray-50 transition-transform hover:scale-105"><X size={24} /></button>
      </div>
      <div className="flex-1 bg-stone-100 relative flex items-center justify-center">
        <div className="absolute inset-0 opacity-10 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/Mecca_street_map.png')] bg-cover bg-center grayscale" />
        <div className="text-center z-10">
          <MapPin size={48} className="text-emerald-800 mx-auto mb-2 animate-bounce" />
          <h2 className="text-2xl font-bold text-gray-900">{t('interactiveMap')}</h2>
          <p className="text-gray-500">{hotel.name[lang]}</p>
        </div>
      </div>
      <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-4">
          <button className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-95"><Navigation size={18} /> {t('routeToHotel')}</button>
          <button className="flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-95"><MapPin size={18} /> {t('routeToHaram')}</button>
        </div>
      </div>
    </div>
  );
};



const CheckoutFlow = ({ hotel, type, onClose, lang, dates, user, onBooked }) => {
  const [step, setStep] = useState(1);
  const t = useTranslation(lang);
  const [seasonalPrices, setSeasonalPrices] = useState([]);
  const [basePrice, setBasePrice] = useState(hotel.price);
  const [loading, setLoading] = useState(false);

  const [exchangeRate, setExchangeRate] = useState(35.80);

  // Fetch Exchange Rate on Mount
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const { data, error } = await supabase.from('exchange_rates')
          .select('rate')
          .eq('base_currency', 'SAR')
          .eq('target_currency', 'DZD')
          .single();
        if (!error && data?.rate) setExchangeRate(data.rate);
      } catch (e) { console.error('Failed to get exchange rate:', e); }
    };
    fetchRate();
  }, []);

  const checkInDate = dates?.checkIn || dates?.start;
  const checkOutDate = dates?.checkOut || dates?.end;
  const guestsCount = dates?.guests || 1;

  const total = React.useMemo(() => {
    if (!checkInDate || !checkOutDate) return hotel.price;
    const calculated = calculatePrice(basePrice, seasonalPrices, checkInDate, checkOutDate);
    // For bed type, price is per person/bed, so multiply by guestsCount
    return type === 'room' ? calculated : (Math.round(calculated / (hotel?.capacity || 4)) * guestsCount);
  }, [basePrice, seasonalPrices, checkInDate, checkOutDate, type, hotel.price, guestsCount, hotel.capacity]);

  const nights = React.useMemo(() => {
    if (!checkInDate || !checkOutDate) return 1;
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  }, [checkInDate, checkOutDate]);

  // Deposit Logic (Canonical Rule 2)
  // If 1 night -> Pay Full -> Status 'paid'
  // If >1 night -> Pay 1st Night -> Status 'confirmed'
  const isOneNight = nights === 1;
  const firstNightPrice = calculateFirstNightPrice(basePrice, seasonalPrices, checkInDate);

  // Calculate Deposit
  // User said: "If 1 night -> pays full".
  const deposit = isOneNight
    ? total
    : (type === 'room' ? firstNightPrice : Math.round(firstNightPrice / (hotel?.capacity || 4)) * guestsCount);

  // Remaining
  const remaining = isOneNight ? 0 : (total - deposit);
  const finalTotal = total;

  // Fetch real pricing on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        if (hotel.isFixedPrice) {
          setSeasonalPrices([]);
          return;
        }
        const rooms = await hotelService.getHotelRooms(hotel.id);
        if (rooms && rooms.length > 0) {
          const r = rooms[0];
          const p = await hotelService.getRoomPrices(r.id);
          setSeasonalPrices(p || []);
          if (r.default_price) setBasePrice(r.default_price);
        }
      } catch (e) { console.error(e); }
    };
    if (hotel.id) loadData();
  }, [hotel.id]);

  const isSubmitting = React.useRef(false);

  const handleBooking = async () => {
    if (isSubmitting.current) return; // Double-click guard
    isSubmitting.current = true;
    setLoading(true);

    if (!user || !user.id) {
      toast.error(lang === 'ar' ? 'يجب تسجيل الدخول أولاً لإتمام الحجز' : 'You must log in to complete the booking');
      setLoading(false);
      isSubmitting.current = false;
      return;
    }

    try {
      const bookingRef = Math.random().toString(36).substring(2, 8).toUpperCase();

      const bookingData = {
        user_id: user?.id,
        status: 'pending', // Canonical Start: Always Pending
        booking_ref: bookingRef,
        check_in: checkInDate,
        check_out: checkOutDate,

        // For Full Room, we record the full capacity as 'guests' (or we could change this field meaning, but user asked for this)
        guests: type === 'room' ? (hotel.capacity || 4) : guestsCount,
        booking_type: type === 'bed' ? 'bed' : 'room',
        deposit_paid: false, // Initially false
        deposit_amount: deposit, // Record expected deposit
        total_price: finalTotal, // New strict accounting enforcement
        offer_id: hotel.offerId || (await hotelService.getHotelOffers(hotel.id))?.[0]?.id // Prioritize passed offerId
      };

      if (!bookingData.offer_id) {
        toast.error(lang === 'ar' ? 'عذراً لا توجد عروض متاحة حالياً' : 'No offers available');
        setLoading(false);
        return;
      }

      // 1. Create Booking (Pending)
      // Fix: createBooking returns the data object directly, not { data, error }
      const newlyCreatedBooking = await bookingService.createBooking(bookingData);

      if (!newlyCreatedBooking || !newlyCreatedBooking.id) {
        throw new Error('Booking creation failed (No ID returned)');
      }

      // 1.5 Frontend Notification sending removed. Database handles 'pending' booking notifications.


      // 2. Process Payment (Redirect to Chargily)
      if (deposit > 0) {
        try {
          const customChargilyLink = await commonService.getAppSettings('chargily_link');
          console.log('[Payment Debug] Fetched customChargilyLink from DB:', customChargilyLink);
          if (customChargilyLink && customChargilyLink.trim() !== '') {
             if (customChargilyLink.trim().startsWith('http')) {
                 console.log('[Payment Debug] Redirecting to Custom Chargily Link:', customChargilyLink);
                 window.location.href = customChargilyLink.trim();
                 return;
             } else {
                 console.warn('[Payment Debug] The saved link is not a valid URL (missing http/https). Value:', customChargilyLink);
                 toast.error(lang === 'ar' ? 'الرابط المباشر غير صالح، يبدو أنك أدخلت مفتاحاً (Key) وليس رابطاً (URL).' : 'Invalid direct link format.');
             }
          }

          // Fix: Use createCheckoutSession instead of direct createPayment to trigger Chargily Flow
          const session = await bookingService.createCheckoutSession(newlyCreatedBooking.id, user.id, bookingRef);

          if (session && session.checkout_url) {
            console.log('Redirecting to Chargily:', session.checkout_url);
            window.location.href = session.checkout_url;
            return; // Stop execution here, let redirect happen
          } else {
            throw new Error('No checkout URL returned from Chargily');
          }

        } catch (payErr) {
          console.error("Payment initiation failed", payErr);
          toast.error(lang === 'ar' ? 'فشل بدء عملية الدفع، يرجى المحاولة مرة أخرى' : 'Payment initiation failed, please try again');
          // For now, throwing error to stop voucher generation, user remains on screen or can retry
          throw payErr;
        }
      }

      // Prepare Voucher Data using the validated object
      const data = newlyCreatedBooking; // Alias for consistency below
      const voucherData = {
        ...data,
        check_in: checkInDate,
        check_out: checkOutDate,
        hotel_name: (hotel.name && typeof hotel.name === 'object' ? (hotel.name[lang] || hotel.name['en']) : hotel.name) || 'Hotel',
        offer_title: (hotel.title && typeof hotel.title === 'object' ? (hotel.title[lang] || hotel.title['en']) : hotel.title) || 'Umrah Offer',
        guest_name: user?.user_metadata?.full_name || user?.full_name || 'Guest',
        booking_type: bookingData.booking_type,
        guests: bookingData.guests,
        total_price: finalTotal,
        deposit_amount: deposit,
        remaining_amount: remaining
      };

      onClose();
      if (onBooked) onBooked(voucherData);
    } catch (e) {
      toast.error(e.message);
    } finally {
      isSubmitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-white w-full md:max-w-md md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-stone-50">
          <h3 className="font-bold text-lg text-gray-900">{step === 1 ? t('confirm') : t('payment')}</h3>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-gray-500 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <img src={hotel.images[0]} className="w-20 h-20 rounded-lg object-cover" alt="" />
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{hotel.name[lang]}</h4>
                  <div className="text-sm font-semibold text-emerald-800 mt-2">{type === 'room' ? t('fullRoom') : t('bedOnly')}</div>
                  <div className="text-xs text-gray-500 mt-1">{dates?.start} → {dates?.end} ({nights} {t('night')})</div>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600"><span>{t('nightPrice')}</span><span>{Math.round(total / nights)} {t('currency')}</span></div>
                <div className="flex justify-between text-gray-600"><span>{t('total')} ({nights} {t('night')})</span><span>{total} {t('currency')}</span></div>
                <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-lg text-gray-900"><span>{t('total')}</span><span>{finalTotal} {t('currency')}</span></div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-6 text-center">
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                <h4 className="font-bold text-emerald-900 mb-2">{isOneNight ? (lang === 'ar' ? 'دفع المبلغ كاملاً' : 'Pay Full Amount') : (lang === 'ar' ? 'دفع العربون فقط' : 'Pay Deposit Only')}</h4>
                <div className="text-3xl font-black text-emerald-700 mb-1">{deposit} {t('currency')}</div>
                <p className="text-xs text-emerald-600">{lang === 'ar' ? 'يعادل سعر ليلة واحدة' : 'Equivalent to 1 night price'}</p>
              </div>
              {!isOneNight && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <div className="flex justify-between items-start text-sm mb-1">
                      <span className="text-gray-500 mt-2">{lang === 'ar' ? 'المبلغ المتبقي' : 'Remaining Amount'}</span>
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-lg text-emerald-900">{Math.round(remaining / exchangeRate).toLocaleString()} SAR</span>
                        <span className="text-xs text-gray-400" dir="ltr">({remaining.toLocaleString()} DZD)</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 text-start">{lang === 'ar' ? 'يدفع عند الوصول للفندق، يخضع السعر لرسوم الصرف' : 'Pay at hotel upon arrival. The exact dual rate depends on market changes.'}</p>
                  </div>
              )}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 bg-white space-y-3">
          <button onClick={() => step === 1 ? setStep(2) : handleBooking()} disabled={loading} className="w-full bg-emerald-800 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-900 transition-colors shadow-lg flex items-center justify-center gap-2">
            {loading ? t('processing') : (step === 1 ? t('confirm') : `${t('pay')} ${deposit} ${t('currency')}`)}
          </button>
        </div>
      </div>
    </div>
  );
};

const BookingVoucherPage = ({ booking, onBack, lang }) => {
  const t = useTranslation(lang);
  const [isCheckedIn, setIsCheckedIn] = useState(!!booking.checked_in_at);
  const [status, setStatus] = useState(booking.checked_in_at ? 'confirmed' : 'pending');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    // Real-time subscription to booking status
    const channel = bookingService.subscribeToBooking(booking.id, (payload) => {
      if (payload.new && payload.new.checked_in_at) {
        setIsCheckedIn(true);
        setStatus('confirmed');
      }
    });

    return () => {
      // Cleanup subscription
      if (channel) channel.unsubscribe();
    };
  }, [booking.id]);

  const printRef = useRef();

  // Prepare PDF data consistently for both the button and the hidden template
  const pdfData = useMemo(() => {
    const pricePerNight = booking.offer?.discount_price || booking.offer?.price_per_night || booking.offer?.price || 0;
    // Make sure we calculate totalPrice identically using the saved room capacity
    const roomPriceForDuration = calculatePrice(booking.offer.price_per_night, booking.offer.season_prices || [], booking.check_in, booking.check_out);
    const totalCalcPrice = booking.booking_type === 'bed' ? (Math.round(roomPriceForDuration / (booking.offer?.room?.capacity || 4)) * (booking.guests || 1)) : roomPriceForDuration;

    return {
      booking_ref: booking.booking_ref,
      customer_name: booking.user?.full_name || booking.guest_name || 'Guest',
      hotel_name: (booking.hotel_name && typeof booking.hotel_name === 'object' ? (booking.hotel_name[lang] || booking.hotel_name['en']) : booking.hotel_name) || (booking.offer?.room?.hotel?.name && typeof booking.offer?.room?.hotel?.name === 'object' ? (booking.offer?.room?.hotel?.name[lang] || booking.offer?.room?.hotel?.name['en']) : booking.offer?.room?.hotel?.name) || 'Hotel',
      check_in: booking.check_in,
      check_out: booking.check_out,
      total_price: booking.total_price || totalCalcPrice,
      deposit_paid: booking.deposit_amount || 0, // Use actual deposit from DB, no percentage fallback
      remaining_amount: booking.remaining_amount || (totalCalcPrice - (booking.deposit_amount || 0)),
      booking_type: booking.booking_type,
      guests: booking.guests || 1,
      offer_name: (booking.offer_title && typeof booking.offer_title === 'object' ? (booking.offer_title[lang] || booking.offer_title['en']) : booking.offer_title) || (booking.offer?.title && typeof booking.offer?.title === 'object' ? (booking.offer?.title[lang] || booking.offer?.title['en']) : booking.offer?.title) || 'Offer'
    };
  }, [booking, lang]);

  // Generate and download PDF voucher
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      if (!printRef.current) throw new Error('Template not ready');
      await generateBookingPdf(printRef.current, `Voucher-${booking.booking_ref}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(lang === 'ar' ? 'حدث خطأ في إنشاء الملف' : 'Error generating PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Simulation Button (Secret)
  const simulateCheckIn = async () => {
    try {
      await hotelService.checkInBooking(booking.id);
      toast.error("Simulating Check-in... (Backend logic needs to set checked_in_at)");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-600 transition-colors duration-1000 flex flex-col items-center justify-center p-6 text-white text-center relative" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <button onClick={onBack} className="absolute top-6 left-6 p-2 bg-white/20 rounded-full hover:bg-white/30"><X size={24} /></button>

      <div className="bg-white text-gray-900 rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6 animate-in zoom-in-95 duration-500">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{isCheckedIn ? (lang === 'ar' ? '✅ تم إتمام الحجز' : '✅ Booking Completed') : (lang === 'ar' ? '⏳ بانتظار إتمام الحجز' : '⏳ Deposit Paid — Pending Completion')}</h2>
          <p className="text-gray-500 text-sm">
            {isCheckedIn
              ? (lang === 'ar' ? 'تم إتمام حجزك بنجاح. شكراً لاختيارك!' : 'Your booking has been completed successfully. Thank you!')
              : (lang === 'ar' ? 'تم دفع العربون بنجاح. المبلغ المتبقي يُدفع عند الوصول للفندق.' : 'Your deposit has been paid. The remaining amount is due at the hotel upon check-in.')}
          </p>
        </div>

        <div className="bg-gray-100 rounded-2xl p-6 border-2 border-dashed border-gray-300">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">{t('bookingRef')}</div>
          <div className="text-4xl font-mono font-black tracking-widest text-gray-900">{booking.booking_ref || 'PENDING'}</div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
            <span className="text-gray-500">{t('hotel')}</span>
            <span className="font-bold">{booking.hotel_name || booking.offer?.room?.hotel?.name || 'Hotel'}</span>
          </div>
          <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
            <span className="text-gray-500">{t('remainingAmount')}</span>
            <span className="font-bold text-xl">{booking.remaining_amount || pdfData.remaining_amount || 0} {t('currency')}</span>
          </div>
        </div>

        {/* Hidden Voucher Template for PDF Generation */}
        <div style={{ position: 'fixed', top: 0, left: '-10000px', zIndex: -50 }}>
          <VoucherTemplate ref={printRef} booking={pdfData} lang={lang} />
        </div>

        {/* PDF Download Button */}
        <button
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={20} />
          {isGeneratingPdf
            ? (lang === 'ar' ? 'جاري الإنشاء...' : 'Generating...')
            : (lang === 'ar' ? 'تحميل وصل الحجز (PDF)' : 'Download PDF Voucher')
          }
        </button>

        {isCheckedIn && (
          <button className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-emerald-700 animate-in slide-in-from-bottom-4">
            {lang === 'ar' ? 'دفع المبلغ المتبقي' : 'Pay Remaining Amount'}
          </button>
        )}

        {/* Dev Secret Button */}
        {!isCheckedIn && (
          <button onClick={simulateCheckIn} className="mt-10 opacity-10 hover:opacity-100 text-xs text-red-500">
            [DEV] Simulate Check-in
          </button>
        )}
      </div>
    </div>
  );
};

const Footer = ({ lang, onPageClick }) => {
  const [links, setLinks] = useState([]);
  useEffect(() => {
    const fetchLinks = async () => {
      const data = await commonService.getAppSettings('footer_links');
      if (data && Array.isArray(data)) {
        setLinks(data);
      } else {
        // Default fallback
        setLinks([
          { title: 'من نحن', url: '/#about' },
          { title: 'الشروط والأحكام', url: '/#terms' },
          { title: 'تواصل معنا', url: '/#contact' }
        ]);
      }
    };
    fetchLinks();
  }, []);

  return (
    <footer className="bg-gray-900 text-white py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1 flex items-center gap-2">
            <div className="w-10 h-10 flex items-center justify-center"><img src={logo} alt="Talbiyah" className="w-full h-full object-contain filter brightness-0 invert opacity-80" /></div>
            <span className="text-xl font-bold tracking-tight text-white">{lang === 'ar' ? 'تلبية' : 'Talbia'}<span className="text-emerald-400">{lang === 'ar' ? 'تسكين' : 'Taskin'}</span></span>
          </div>
          <div className="md:col-span-3 flex flex-wrap gap-x-8 gap-y-4 md:justify-end">
            {links.map((link, idx) => {
              const isInternal = link.url && link.url.startsWith('#page=');
              return (
                <a key={idx} href={isInternal ? '#' : link.url} onClick={(e) => {
                  if (isInternal) {
                    e.preventDefault();
                    onPageClick(link.url.split('=')[1]);
                  }
                }} className="text-gray-400 hover:text-white transition-colors text-sm font-medium">
                  {link.title}
                </a>
              );
            })}
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Talbia Taskin. {lang === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</p>
        </div>
      </div>
    </footer>
  );
};

// --- User Components (Navbar, Auth, etc.) ---
const Navbar = ({ role, setRole, onOpenAuth, onOpenProfile, isLoggedIn, profiles, lang, setLang }) => {
  const [scrolled, setScrolled] = useState(false);
  const t = useTranslation(lang);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setRole('user')}>
          <div className="w-10 h-10 flex items-center justify-center"><img src={logo} alt="Talbiyah" className="w-full h-full object-contain" /></div>
          <span className={`text-xl font-bold tracking-tight ${scrolled ? 'text-emerald-900' : 'text-emerald-900'} md:block hidden`}>{t('appTitle')}<span className="text-amber-600">{t('appSubTitle')}</span></span>
        </div>
        <div className="flex items-center gap-3">

          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-full hover:bg-gray-100 transition-colors"><Globe size={18} /><span>{lang === 'ar' ? 'English' : 'العربية'}</span></button>

          {isLoggedIn ? (
            <>
              {/* Admin Panel Button */}
              {(role === 'admin' || profiles?.role === 'admin') ? (
                <button onClick={() => setRole('admin')} className="flex items-center gap-2 text-sm font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-full transition-colors border border-amber-200 shadow-sm">
                  <Shield size={18} />
                  <span>{lang === 'ar' ? 'لوحة الإدارة' : 'Admin Panel'}</span>
                </button>
              ) :
                /* Hotel Panel Button: Show if role or profile says hotel/partner */
                (role === 'partner' || role === 'hotel' || profiles?.role === 'hotel' || profiles?.role === 'partner') ? (
                  <button onClick={() => setRole('partner')} className="flex items-center gap-2 text-sm font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-full transition-colors border border-emerald-100 shadow-sm">
                    <Hotel size={18} />
                    <span>{lang === 'ar' ? 'لوحة الفندق' : 'Hotel Panel'}</span>
                  </button>
                ) : (
                  <button onClick={onOpenProfile} className="flex items-center gap-2 bg-white border border-gray-200 hover:shadow-md transition-all px-3 py-2 rounded-full"><Menu size={18} className="text-gray-600" /><div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center border border-emerald-200"><span className="text-emerald-800 font-bold text-xs">{lang === 'ar' ? 'أ' : 'A'}</span></div></button>
                )}
            </>
          ) : (
            <button onClick={onOpenAuth} className="bg-emerald-800 text-white px-5 py-2.5 rounded-full font-bold text-sm hover:bg-emerald-900 transition-colors shadow-lg shadow-emerald-800/20">{t('login')}</button>
          )}
        </div>
      </div>
    </nav>
  );
};

const AuthModal = ({ isOpen, onClose, onLogin, lang, setLang }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState('male');
  const t = useTranslation(lang);
  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(URL.createObjectURL(e.target.files[0]));
      setAvatarFile(e.target.files[0]);
    }
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative">
        <button onClick={onClose} className={`absolute ${lang === 'ar' ? 'left-4' : 'right-4'} top-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10`}><X size={20} /></button>
        <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-4 p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-colors z-10 flex items-center gap-1 text-xs font-bold`}><Globe size={16} /> {lang === 'ar' ? 'English' : 'العربية'}</button>
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{isLogin ? t('welcomeBack') : t('createAccount')}</h2>
          <p className="text-gray-500 text-sm mb-6">{isLogin ? t('loginDesc') : t('registerDesc')}</p>
          <div className="space-y-4">
            {!isLogin && (<div className="flex flex-col items-center mb-6"><label className="relative cursor-pointer group"><div className={`w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden transition-all ${avatar ? 'border-emerald-500' : 'group-hover:border-emerald-400'}`}>{avatar ? (<img src={avatar} alt="Avatar" className="w-full h-full object-cover" />) : (<div className="text-center text-gray-400"><Upload size={24} className="mx-auto mb-1" /><span className="text-[10px]">{t('uploadPhoto')}</span></div>)}</div><input type="file" className="hidden" onChange={handleAvatarChange} accept="image/*" /><div className={`absolute bottom-0 ${lang === 'ar' ? 'right-0' : 'left-0'} bg-emerald-600 text-white p-1.5 rounded-full shadow-md`}><ImageIcon size={14} /></div></label></div>)}
            {!isLogin && (<div className="relative"><User className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-3.5 text-gray-400`} size={18} /><input type="text" placeholder={t('name')} value={name} onChange={(e) => setName(e.target.value)} className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-3 ${lang === 'ar' ? 'pr-11 pl-4' : 'pl-11 pr-4'} focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium`} /></div>)}
            {!isLogin && (
              <>
                <div className="relative"><Phone className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-3.5 text-gray-400`} size={18} /><input type="tel" placeholder={lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'} value={phone} onChange={(e) => setPhone(e.target.value)} className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-3 ${lang === 'ar' ? 'pr-11 pl-4' : 'pl-11 pr-4'} focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium`} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative"><MapPin className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-3.5 text-gray-400`} size={18} /><input type="text" placeholder={lang === 'ar' ? 'الولاية' : 'State/Wilaya'} value={state} onChange={(e) => setState(e.target.value)} className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-3 ${lang === 'ar' ? 'pr-11 pl-4' : 'pl-11 pr-4'} focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium`} /></div>
                  <div className="relative"><MapPin className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-3.5 text-gray-400`} size={18} /><input type="text" placeholder={lang === 'ar' ? 'المدينة' : 'City'} value={city} onChange={(e) => setCity(e.target.value)} className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-3 ${lang === 'ar' ? 'pr-11 pl-4' : 'pl-11 pr-4'} focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium`} /></div>
                </div>
                <div className="flex gap-4 items-center justify-center p-2">
                  <label className={`flex items-center gap-2 cursor-pointer ${gender === 'male' ? 'text-emerald-800 font-bold' : 'text-gray-500'}`}><input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={() => setGender('male')} className="accent-emerald-600" /> {lang === 'ar' ? 'ذكر' : 'Male'}</label>
                  <label className={`flex items-center gap-2 cursor-pointer ${gender === 'female' ? 'text-emerald-800 font-bold' : 'text-gray-500'}`}><input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={() => setGender('female')} className="accent-emerald-600" /> {lang === 'ar' ? 'أنثى' : 'Female'}</label>
                </div>
              </>
            )}
            <div className="relative"><Mail className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-3.5 text-gray-400`} size={18} /><input type="email" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-3 ${lang === 'ar' ? 'pr-11 pl-4' : 'pl-11 pr-4'} focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium`} /></div>
            <div className="relative"><Lock className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-3.5 text-gray-400`} size={18} /><input type={showPassword ? "text" : "password"} placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-3 ${lang === 'ar' ? 'pr-11 pl-12' : 'pl-11 pr-12'} focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium`} /><button onClick={() => setShowPassword(!showPassword)} className={`absolute ${lang === 'ar' ? 'left-4' : 'right-4'} top-3.5 text-gray-400 hover:text-gray-600`}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            <button onClick={() => { onLogin(email, password, name, !isLogin, avatarFile, phone, state, city, gender); onClose(); }} className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98]">{isLogin ? t('loginVerb') : t('registerNow')}</button>
            <div className="mt-6 text-center text-sm text-gray-500">
              {isLogin ? t('noAccount') : t('haveAccount')}
              <button onClick={() => setIsLogin(!isLogin)} className="font-bold text-emerald-800 hover:underline mx-1">
                {isLogin ? t('registerNow') : t('loginVerb')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DateRangePicker = ({ onClose, onSelect, initialRange, lang, minDate, maxDate }) => {
  const t = useTranslation(lang);
  const [dateRange, setDateRange] = useState(initialRange || { start: null, end: null });
  const [viewDate, setViewDate] = useState(() => initialRange?.start ? new Date(initialRange.start) : new Date());
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
  const handleDateClick = (day) => {
    const selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const offsetDate = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000));
    const dateStr = offsetDate.toISOString().split('T')[0];
    if (!dateRange.start || (dateRange.start && dateRange.end)) { setDateRange({ start: dateStr, end: null }); } else { if (dateStr < dateRange.start) { setDateRange({ start: dateStr, end: dateRange.start }); } else { setDateRange({ ...dateRange, end: dateStr }); } }
  };
  const renderDays = () => {
    const year = viewDate.getFullYear(); const month = viewDate.getMonth(); const daysInMonth = getDaysInMonth(year, month); const firstDay = getFirstDayOfMonth(year, month);
    const padding = Array(firstDay).fill(null); const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return [...padding, ...days].map((day, index) => {
      if (!day) return <div key={`pad-${index}`} className="h-9 w-9" />;
      const currentDate = new Date(year, month, day);
      const currentDateStr = new Date(currentDate.getTime() - (currentDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

      let isStart = dateRange.start === currentDateStr;
      let isEnd = dateRange.end === currentDateStr;
      let isRange = dateRange.start && dateRange.end && currentDateStr > dateRange.start && currentDateStr < dateRange.end;

      // Constraints Check
      let isDisabled = false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cDateClean = new Date(currentDateStr);
      cDateClean.setHours(0, 0, 0, 0);

      if (cDateClean < today) isDisabled = true;
      if (minDate && currentDateStr < minDate) isDisabled = true;
      if (maxDate && currentDateStr > maxDate) isDisabled = true;

      let classes = "h-9 w-9 flex items-center justify-center rounded-full text-sm transition-colors ";

      if (isDisabled) {
        classes += "text-gray-300 cursor-not-allowed bg-gray-50";
      } else if (isStart || isEnd) {
        classes += "bg-emerald-800 text-white shadow-md font-bold cursor-pointer";
      } else if (isRange) {
        classes += "bg-emerald-50 text-emerald-800 rounded-none font-medium cursor-pointer";
      } else {
        classes += "hover:bg-gray-100 cursor-pointer text-gray-700";
      }

      return <div key={day} onClick={() => !isDisabled && handleDateClick(day)} className={classes}>{day}</div>;
    });
  };
  return (
    <div className={`absolute top-full ${lang === 'ar' ? 'right-0' : 'left-0'} mt-4 bg-white p-6 rounded-3xl shadow-2xl border border-gray-100 w-[350px] z-50 animate-in fade-in zoom-in-95 duration-200`}>
      <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-gray-900">{t('selectDates')}</h3></div>
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2 text-sm font-bold text-gray-900 px-2"><span>{TRANSLATIONS[lang].months[viewDate.getMonth()]} {viewDate.getFullYear()}</span><div className="flex gap-2"><button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + (lang === 'ar' ? 1 : -1), 1))} className="p-1 hover:bg-gray-100 rounded-full">{lang === 'ar' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}</button><button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + (lang === 'ar' ? -1 : 1), 1))} className="p-1 hover:bg-gray-100 rounded-full">{lang === 'ar' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}</button></div></div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-2 font-medium">{TRANSLATIONS[lang].daysShort.map((d, i) => <span key={i}>{d}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
      </div>
      <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
        <div className="flex justify-between items-center"><div className="text-sm"><div className="text-gray-500 text-xs">{t('date')}</div><div className="font-bold text-emerald-800">{dateRange.start ? (dateRange.end ? `${dateRange.start} -> ${dateRange.end}` : dateRange.start) : '-'}</div></div><button onClick={() => { onSelect(dateRange); onClose(); }} disabled={!dateRange.start || !dateRange.end} className="bg-emerald-800 disabled:bg-gray-300 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-emerald-900 transition-colors">{t('confirm')}</button></div>
        <button onClick={() => { setDateRange({ start: null, end: null }); onSelect({ start: null, end: null }); }} className="text-xs text-red-500 font-bold hover:underline self-start">{t('clearDates')}</button>
      </div>
    </div>
  );
};

const AdvancedSearch = ({ filters, setFilters, lang, onSearch, onSaveSearch, setSearchTriggered }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [searchTerm, setSearchTerm] = useState(filters.hotelName || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [cities, setCities] = useState([]);
  const t = useTranslation(lang);

  useEffect(() => {
    const fetchCities = async () => {
      const uniqueCities = await hotelService.getUniqueCities();
      const baseCities = ['makkah', 'madinah'];
      if (uniqueCities && uniqueCities.length > 0) {
        const combined = new Set([...baseCities, ...uniqueCities.map(c => c.toLowerCase())]);
        setCities(Array.from(combined));
      } else {
        setCities(baseCities);
      }
    };
    fetchCities();
  }, []);

  // Autocomplete
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.length > 1) {
        const results = await hotelService.searchHotelsByName(searchTerm);
        setSuggestions(results || []);
      } else {
        setSuggestions([]);
      }
    };
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const formatDateShort = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  return (
    <div className="pt-28 pb-8 px-4 md:px-6 max-w-7xl mx-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-3xl shadow-[0_12px_40px_-10px_rgba(0,0,0,0.08)] border border-gray-100 p-6 max-w-5xl mx-auto relative z-30">
        <div className="flex justify-center mb-6"><div className="bg-gray-100 p-1 rounded-xl inline-flex"><button onClick={() => setFilters({ ...filters, type: 'room' })} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${filters.type === 'room' ? 'bg-white text-emerald-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t('fullRoom')}</button><button onClick={() => setFilters({ ...filters, type: 'bed' })} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${filters.type === 'bed' ? 'bg-white text-emerald-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t('bedOnly')}</button></div></div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-2 space-y-1.5"><label className={`text-xs font-bold text-gray-500 uppercase tracking-wider ${lang === 'ar' ? 'mr-1' : 'ml-1'}`}>{t('dest')}</label><div className="relative"><select value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} className={`w-full bg-gray-50 border-none rounded-xl py-3 ${lang === 'ar' ? 'pr-4 pl-8' : 'pl-4 pr-8'} font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer appearance-none hover:bg-gray-100`}>
            {cities.map(city => {
              const c = city.toLowerCase();
              return (
                <option key={city} value={city}>
                  {c === 'makkah' || c === 'مكة' ? t('makkah') : c === 'madinah' || c === 'المدينة' ? t('madinah') : city}
                </option>
              );
            })}
          </select><ChevronDown className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none`} size={16} /></div></div>
          <div className="md:col-span-3 space-y-1.5 relative">
            <label className={`text-xs font-bold text-gray-500 uppercase tracking-wider ${lang === 'ar' ? 'mr-1' : 'ml-1'}`}>{t('hotel')}</label>
            <div className="relative">
              <input type="text" placeholder={t('search') + "..."} value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); setFilters({ ...filters, hotelName: e.target.value }); }}
                className={`w-full bg-gray-50 border-none rounded-xl py-3 ${lang === 'ar' ? 'pr-4 pl-10' : 'pl-4 pr-10'} font-medium text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500/20 hover:bg-gray-100`} />
              <Search className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-gray-400`} size={16} />
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 max-h-48 overflow-y-auto">
                {suggestions.map(h => (
                  <div key={h.id} onClick={() => { setSearchTerm(h.name); setFilters({ ...filters, hotelName: h.name }); setShowSuggestions(false); }} className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700 flex justify-between">
                    <span>{h.name}</span>
                    <span className="text-xs text-gray-400">{h.city?.toLowerCase() === 'makkah' || h.city === 'مكة' ? t('makkah') : h.city?.toLowerCase() === 'madinah' || h.city === 'المدينة' ? t('madinah') : h.city}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-3 space-y-1.5 relative"><label className={`text-xs font-bold text-gray-500 uppercase tracking-wider ${lang === 'ar' ? 'mr-1' : 'ml-1'}`}>{t('date')}</label><div onClick={() => setShowCalendar(!showCalendar)} className={`bg-gray-50 rounded-xl py-3 px-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors group ${showCalendar ? 'ring-2 ring-emerald-500/20 bg-white' : ''}`}><span className="font-semibold text-gray-900 text-sm">{filters.dates.start ? `${formatDateShort(filters.dates.start)} -> ${formatDateShort(filters.dates.end)}` : t('selectDates')}</span><CalendarIcon size={16} className="text-gray-400 group-hover:text-emerald-700" /></div>{showCalendar && (<DateRangePicker onClose={() => setShowCalendar(false)} onSelect={(range) => setFilters({ ...filters, dates: range })} initialRange={filters.dates} lang={lang} />)}</div>
          <div className="md:col-span-2 space-y-1.5"><label className={`text-xs font-bold text-gray-500 uppercase tracking-wider ${lang === 'ar' ? 'mr-1' : 'ml-1'}`}>{t('guests')}</label><div className="relative"><select value={filters.capacity} onChange={(e) => setFilters({ ...filters, capacity: e.target.value })} className={`w-full bg-gray-50 border-none rounded-xl py-3 ${lang === 'ar' ? 'pr-4 pl-8' : 'pl-4 pr-8'} font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer appearance-none hover:bg-gray-100`}><option value="all">{t('roomOptions.all')}</option><option value="2">{t('roomOptions.double')}</option><option value="3">{t('roomOptions.triple')}</option><option value="4">{t('roomOptions.quad')}</option><option value="5">{t('roomOptions.quint')}</option></select><Users className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none`} size={16} /></div></div>
          <div className="md:col-span-2 flex gap-2">
            <button onClick={() => { onSearch(); setSearchTriggered(true); }} className="w-full bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl py-3 font-bold text-sm shadow-lg hover:shadow-xl transform active:scale-95 transition-all flex items-center justify-center gap-2"><Search size={18} />{t('search')}</button>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4"><div className="flex items-center gap-4 w-full md:w-auto"><span className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{t('budget')}</span><div className="flex-1 md:w-64 flex items-center gap-3"><span className="text-sm font-medium text-gray-600">2000</span><input type="range" min="2000" max="50000" step="500" value={filters.budget} onChange={(e) => setFilters({ ...filters, budget: parseInt(e.target.value) })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-800" dir="ltr" /><span className="text-sm font-bold text-emerald-900">{filters.budget} {t('currency')}</span></div></div></div>
      </div>
      {/* Trust Bar */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><Shield size={14} className="text-emerald-600" />{lang === 'ar' ? 'دفع آمن 100%' : '100% Secure'}</span>
        <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-600" />{lang === 'ar' ? 'فنادق موثقة' : 'Verified Hotels'}</span>
        <span className="flex items-center gap-1.5"><Users size={14} className="text-emerald-600" />{lang === 'ar' ? '+2,500 معتمر سعيد' : '+2,500 Happy Pilgrims'}</span>
      </div>
    </div>
  );
};

// --- Hotel Details ---
const HotelDetails = ({ hotel, onBack, lang, onOpenChat, filters, user, profile, onBooked, isFavorite, onToggleFavorite, showToast, isUserOnline }) => {
  const [activeTab, setActiveTab] = useState('room');
  const [showCheckout, setShowCheckout] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedPageSlug, setSelectedPageSlug] = useState(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false); // Fix: Add missing state
  const [checkIn, setCheckIn] = useState(filters?.dates?.checkIn || filters?.dates?.start || '');
  const [checkOut, setCheckOut] = useState(filters?.dates?.checkOut || filters?.dates?.end || '');

  // CHECK: Does user have a confirmed/paid booking for this offer? or any offer in this hotel?
  // We need to know if we should show "Roommates" or "Recent Bookers"
  // Since we don't have global bookings here, we rely on props or fetch.
  // Actually, we can assume if 'onBooked' was called or if we check `useBookings` cache.
  // Ideally passed from parent. But let's use useBookings hook here safely.
  const { data: myBookings = [] } = useBookings(user?.id, { enabled: !!user });
  const myBookingForThis = myBookings.find(b => b.offer_id === (hotel.offerId || hotel.id) && (b.status === 'confirmed' || b.status === 'paid'));

  // Mode Selection
  // If I have a paid booking: Show Roommates (Intersecting Dates)
  // Else: Hide Section (Strict Requirement 4: Delete Recent Bookers)
  const isRoommateMode = !!myBookingForThis;

  // Hook Args
  // If Roommate: Use my booking dates (will find intersecting bookings)
  // If Visitor: Dates are irrelevant, fetch latest bookings indiscriminately
  const pilgrimsCheckIn = isRoommateMode ? myBookingForThis.check_in : null;
  const pilgrimsCheckOut = isRoommateMode ? myBookingForThis.check_out : null;

  // Always fetch pilgrims (Visitor sees latest, Roommate sees intersecting)
  const { data: offerPilgrimsData } = useOfferPilgrims(hotel.offerId || hotel.id, pilgrimsCheckIn, pilgrimsCheckOut, user?.id, { enabled: true });
  // Service already deduplicates and returns flattened objects { id, name, avatar... }
  const offerPilgrims = offerPilgrimsData || [];

  const [visibleRoommates, setVisibleRoommates] = useState(6);

  // Sync state with filters
  useEffect(() => {
    setCheckIn(filters?.dates?.checkIn || filters?.dates?.start || '');
    setCheckOut(filters?.dates?.checkOut || filters?.dates?.end || '');
  }, [filters]);

  // Handle Download PDF (Voucher)
  const handleDownloadVoucher = () => {
    if (!myBookingForThis) return;
    // ... logic ...
  };

  const [guests, setGuests] = useState(1);
  const [isRateOpen, setIsRateOpen] = useState(false);
  const [availability, setAvailability] = useState({ checked: false, available: true, loading: false });
  const isPartial = hotel?.occupancyStatus === 'partial';
  const [effectiveTab, setEffectiveTab] = useState(isPartial ? 'bed' : 'room'); // Use state for effectiveTab
  const t = useTranslation(lang);


  // Check availability for selected dates
  const checkAvailability = async () => {
    if (!checkIn || !checkOut) return;
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);

    // Strict Same Day Check (Robust)
    if (d1.toDateString() === d2.toDateString() || d1 >= d2) {
      setAvailability({ checked: true, available: false, loading: false, conflicts: [{ date: checkIn, available: 0, reason: lang === 'ar' ? 'يجب أن يكون المغادرة بعد الوصول (ليلة واحدة على الأقل)' : 'Check-out must be after Check-in (min 1 night)', isFullRoom: true }] });
      return;
    }

    setAvailability({ checked: false, available: true, loading: true });
    try {
      const reqQty = effectiveTab === 'bed' ? guests : (hotel.capacity || 4);
      const result = await bookingService.checkOfferAvailability(hotel.offerId || hotel.id, checkIn, checkOut, hotel.capacity || 4, reqQty);
      setAvailability({ checked: true, available: result.available, loading: false, conflicts: result.conflicts });
    } catch (e) {
      console.error(e);
      setAvailability({ checked: true, available: false, loading: false });
    }
  };

  // Auto-check availability when dates/guests change
  useEffect(() => {
    if (checkIn && checkOut) {
      const timer = setTimeout(checkAvailability, 500);
      return () => clearTimeout(timer);
    }
  }, [checkIn, checkOut, guests, effectiveTab]); // Use effectiveTab here

  // Safety check to prevent white screen crash
  if (!hotel) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-800"></div></div>;

  return (
    <>
      <div className="min-h-screen bg-white pb-24 animate-in fade-in slide-in-from-bottom-4 duration-300" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className={`fixed top-0 ${lang === 'ar' ? 'right-0' : 'left-0'} w-full z-40 p-4 flex justify-between items-start pointer-events-none`}>
          <div className="pointer-events-auto flex gap-2">
            {/* Only show favorite button for pilgrim users, not hotel/admin */}
            {(!profile?.role || profile?.role === 'user') && (
              <button onClick={() => onToggleFavorite && onToggleFavorite(hotel.offerId || hotel.id)} className="p-2.5 bg-white/90 backdrop-blur-md rounded-full text-gray-800 shadow-sm hover:text-red-500 hover:bg-white transition-all">
                <Heart size={20} className={isFavorite ? "fill-red-500 text-red-500" : ""} />
              </button>
            )}

            <button type="button" onClick={() => setIsShareOpen(true)} className="p-2.5 bg-white/90 backdrop-blur-md rounded-full text-gray-800 shadow-sm hover:bg-white transition-all"><Share2 size={20} /></button>

          </div>
          <button onClick={onBack} className="pointer-events-auto p-2.5 bg-white/90 backdrop-blur-md rounded-full text-gray-800 shadow-sm hover:bg-white transition-all"><ArrowRight size={20} className={lang === 'ar' ? "transform rotate-180" : ""} /></button>
        </div>
        {/* Mobile Images (Horizontal Scroll Snap) */}
        <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory no-scrollbar w-full aspect-[4/3]">
          {(hotel?.images && hotel.images.length > 0 ? hotel.images : ['https://placehold.co/800x600/e2e8f0/64748b?text=No+Image']).map((img, i) => (
            <div key={i} className="w-full h-full flex-shrink-0 snap-center relative">
              <img src={img} className="w-full h-full object-cover" alt={`Image ${i}`} />
              {/* Image Counter Badge */}
              <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                {i + 1} / {hotel?.images?.length || 1}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Images (Grid) */}
        <div className="hidden md:grid grid-cols-4 gap-1 aspect-[21/9] w-full relative">
          <div className="col-span-2 row-span-2 h-full relative group">
            <img src={(hotel?.images && hotel.images[0]) || 'https://placehold.co/800x600/e2e8f0/64748b?text=No+Image'} className={`w-full h-full object-cover ${lang === 'ar' ? 'rounded-bl-2xl' : 'rounded-br-2xl'}`} alt="Main" />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
          </div>
          {(hotel?.images || []).slice(1, 5).map((img, i) => (
            <div key={i} className="h-full relative group">
              <img src={img || 'https://placehold.co/400x300/e2e8f0/64748b?text=No+Image'} className="w-full h-full object-cover" alt={`Thumb ${i}`} />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
            </div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">{t('hotel')}</span>
                <div className="flex items-center gap-1 text-amber-500">
                  {hotel?.rating > 0 ? (
                    <>
                      <Star size={12} className="fill-current" />
                      <span className="text-xs font-bold text-gray-900">{hotel.rating}</span>
                    </>
                  ) : (
                    <>
                      <Star size={12} className="text-gray-300" />
                      <span className="text-xs font-bold text-gray-400">(0)</span>
                    </>
                  )}
                </div>
                {(!profile?.role || profile?.role === 'user') && (
                  <button onClick={() => setIsRateOpen(true)} className="flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-full transition-all shadow-sm">
                    <Star size={10} className="fill-current" />
                    {lang === 'ar' ? 'قيم الآن' : 'Rate Now'}
                  </button>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{hotel?.name}</h1>
              <div className="flex items-center text-gray-500 text-sm gap-4">
                <span className="flex items-center gap-1"><MapPin size={14} /> {hotel?.distance} m</span>
                <span className="flex items-center gap-1"><Clock size={14} /> {hotel?.walking_time_minutes || '5'} min</span>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-6">
              <h3 className="font-bold text-lg text-gray-900 mb-3">{t('about')}</h3>
              <p className="text-gray-600 leading-relaxed text-sm">{hotel.description}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                {(hotel?.amenities || []).map((amenity, i) => (<div key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg"><Check size={14} className="text-emerald-600" />{amenity}</div>))}
              </div>
            </div>
            <div className="border-t border-gray-100 pt-6">
              <HotelMapViewer
                lang={lang}
                hotelName={hotel?.name}
                latitude={hotel?.coordinates?.lat || hotel?.latitude}
                longitude={hotel?.coordinates?.lng || hotel?.longitude}
              />
            </div>
            {/* Roommates / Pilgrims Preview Section */}
            {(() => {
              const intersectingPilgrims = offerPilgrims.filter(p => {
                if (!checkIn || !checkOut || !p.check_in || !p.check_out) return false;
                const pIn = new Date(p.check_in).getTime();
                const pOut = new Date(p.check_out).getTime();
                const myIn = new Date(checkIn).getTime();
                const myOut = new Date(checkOut).getTime();
                return pIn < myOut && pOut > myIn;
              });
              const otherPilgrims = offerPilgrims.filter(p => !intersectingPilgrims.includes(p));

              if (offerPilgrims.length === 0) return null;

              const sections = myBookingForThis
                ? [
                  { title: lang === 'ar' ? 'شركاء غرفتي' : 'My Room Partners', pilgrims: intersectingPilgrims, highlight: true },
                  { title: lang === 'ar' ? 'معتمرون آخرون' : 'Other Pilgrims', pilgrims: otherPilgrims, highlight: false }
                ].filter(s => s.pilgrims.length > 0)
                : [
                  { title: lang === 'ar' ? 'معتمرون حجزوا هذا العرض' : 'Pilgrims booked this offer', pilgrims: offerPilgrims, highlight: false }
                ].filter(s => s.pilgrims.length > 0);

              return (
                <div className="border-t border-gray-100 pt-6 animate-in slide-in-from-bottom-2">
                  {sections.map((section, idx) => (
                    <div key={idx} className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          <Users size={18} className="text-emerald-600" />
                          {section.title}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {section.pilgrims.slice(0, visibleRoommates).map(pilgrim => (
                          <div key={pilgrim?.id || Math.random()} className={`border ${section.highlight ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100 bg-white'} rounded-xl p-4 flex gap-3 hover:border-emerald-300 hover:ring-2 hover:ring-emerald-50 transition-all shadow-sm group cursor-default`}>
                            <div className="relative shrink-0">
                              {pilgrim?.avatar ? (
                                <img
                                  src={pilgrim.avatar}
                                  alt={pilgrim?.name || 'Guest'}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md bg-white"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full border-2 border-white bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-bold shadow-md">
                                  {(pilgrim?.name === 'Guest' || !pilgrim?.name) ? 'GU' : pilgrim.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              {/* Online Status Indicator */}
                              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-white rounded-full ${isUserOnline && isUserOnline(pilgrim?.id) ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-bold text-gray-900 text-sm truncate flex items-center gap-1">
                                    {pilgrim?.name === 'Guest' || !pilgrim?.name ? (lang === 'ar' ? 'معتمر' : 'Guest') : pilgrim.name}
                                  </div>
                                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                                    <MapPin size={10} className="text-emerald-600" />
                                    {pilgrim?.wilaya || (lang === 'ar' ? 'غير محدد' : 'Unknown')}
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (pilgrim) onOpenChat({
                                      id: pilgrim.id,
                                      full_name: pilgrim?.name === 'Guest' || !pilgrim?.name ? (lang === 'ar' ? 'معتمر' : 'Guest') : pilgrim.name,
                                      avatar_url: pilgrim.avatar,
                                      offer_id: hotel.offerId || hotel.id
                                    });
                                  }}
                                  className={`p-2 rounded-full transition-all shadow-sm ${section.highlight ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                  title={lang === 'ar' ? 'مراسلة' : 'Message'}
                                >
                                  <MessageCircle size={16} />
                                </button>
                              </div>

                              {/* Booking Info Display */}
                              {pilgrim.check_in && pilgrim.check_out && (
                                <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded inline-flex font-medium">
                                  <Calendar size={10} />
                                  {pilgrim.check_in} {lang === 'ar' ? '←' : '→'} {pilgrim.check_out}
                                </div>
                              )}

                              {/* Bio Tags Display */}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {(pilgrim?.bio_tags || []).slice(0, 2).map((tag, idx) => (
                                  <span key={idx} className="text-[10px] bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded border border-gray-100">{tag}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Load More Button */}
            {visibleRoommates < offerPilgrims.length && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setVisibleRoommates(prev => prev + 5)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  {lang === 'ar' ? 'عرض المزيد' : 'Show More'} <ChevronDown size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <div className="sticky top-24 bg-white border border-gray-100 rounded-2xl shadow-lg p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div><span className="text-2xl font-bold text-gray-900">{effectiveTab === 'bed' ? Math.round(hotel?.price / (hotel?.capacity || 4)) : hotel?.price} {t('currency')}</span><span className="text-gray-500 text-sm font-medium"> / {t('night')}</span></div>
                {hotel?.urgency?.[lang] && <div className="bg-rose-50 text-rose-600 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1"><Flame size={10} /> {hotel.urgency[lang]}</div>}
              </div>

              {/* Date Picker with Offer Constraints */}
              {hotel?.available_from && hotel?.available_to && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-sm">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CalendarIcon size={14} />
                    <span className="font-medium">{lang === 'ar' ? 'فترة العرض:' : 'Offer Period:'}</span>
                    <span>{hotel.available_from} → {hotel.available_to}</span>
                  </div>
                </div>
              )}

              {/* Calendar Popover */}
              {isCalendarOpen && (
                <div className="absolute top-24 left-0 right-0 z-50 flex justify-center">
                  <DateRangePicker
                    onClose={() => setIsCalendarOpen(false)}
                    onSelect={(range) => {
                      if (range.start) setCheckIn(range.start);
                      if (range.end) setCheckOut(range.end);
                    }}
                    initialRange={{ start: checkIn, end: checkOut }}
                    minDate={hotel?.available_from}
                    maxDate={hotel?.available_to}
                    lang={lang}
                  />
                </div>
              )}
              <div className="border border-gray-200 rounded-xl overflow-hidden hover:border-emerald-300 transition-colors cursor-pointer" onClick={() => setIsCalendarOpen && setIsCalendarOpen(true)}>
                <div className="grid grid-cols-2 divide-x divide-gray-200">
                  <div className="p-3">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{lang === 'ar' ? 'تاريخ الدخول' : 'Check-in'}</label>
                    <input
                      type="text"
                      readOnly
                      value={checkIn}
                      placeholder={lang === 'ar' ? 'اختر التاريخ' : 'Select Date'}
                      className="w-full text-sm font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer"
                    />
                  </div>
                  <div className="p-3">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{lang === 'ar' ? 'تاريخ الخروج' : 'Check-out'}</label>
                    <input
                      type="text"
                      readOnly
                      value={checkOut}
                      placeholder={lang === 'ar' ? 'اختر التاريخ' : 'Select Date'}
                      className="w-full text-sm font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Date validation message */}
              {(checkIn && checkOut && (new Date(checkIn) < new Date(hotel?.available_from) || new Date(checkOut) > new Date(hotel?.available_to))) && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-700 rounded-xl text-sm">
                  <AlertCircle size={16} />
                  <span>{lang === 'ar' ? 'التواريخ المختارة خارج فترة العرض المتاحة' : 'Selected dates are outside the available offer period'}</span>
                </div>
              )}

              {/* Availability Status */}
              {availability.loading && (
                <div className="flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-500">{lang === 'ar' ? 'جار التحقق...' : 'Checking availability...'}</span>
                </div>
              )}
              {availability.checked && !availability.loading && (
                <div className={`p-3 rounded-xl ${availability.available ? 'bg-emerald-50 text-emerald-700 flex items-center gap-2' : 'bg-red-50 text-red-700'}`}>
                  {availability.available ? (
                    <>
                      <CheckCircle size={18} />
                      <span className="text-sm font-medium">{lang === 'ar' ? 'متاح للحجز!' : 'Available!'}</span>
                    </>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle size={18} />
                        <span className="text-sm font-bold">
                          {(availability.conflicts?.[0]?.reason?.includes('Check-out') || availability.conflicts?.[0]?.reason?.includes('Invalid') || availability.conflicts?.[0]?.reason?.includes('المغادرة'))
                            ? availability.conflicts[0].reason
                            : (lang === 'ar' ? 'غير متاح لهذا العدد' : 'Not available for this capacity')}
                        </span>
                      </div>
                      {/* Show list for actual booking conflicts (not validation errors), even if single */}
                      {availability.conflicts && availability.conflicts.length > 0 &&
                        !availability.conflicts[0].reason?.includes('Check-out') &&
                        !availability.conflicts[0].reason?.includes('Invalid') &&
                        !availability.conflicts[0].reason?.includes('المغادرة') && (
                          <ul className="list-disc list-inside space-y-1 text-xs opacity-90 pl-1">
                            {availability.conflicts.map((c, i) => (
                              <li key={i}>
                                {new Date(c.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })}:
                                {c.isFullRoom
                                  ? (lang === 'ar' ? ' محجوز بالكامل' : ' Fully Booked')
                                  : (lang === 'ar' ? ` متبقي ${c.available} سرير` : ` Only ${c.available} beds left`)}
                              </li>
                            ))}
                          </ul>
                        )}
                      {(!availability.conflicts || availability.conflicts.length === 0) && (
                        <div className="text-xs opacity-90">{lang === 'ar' ? 'يرجى تغيير التواريخ أو تقليل العدد' : 'Please change dates or reduce guests'}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Guest Selector */}
              <div className="border border-gray-200 rounded-xl p-3 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-700">{lang === 'ar' ? 'عدد المعتمرين' : 'Guests'}</span>
                <div className="flex items-center gap-3">
                  <button
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50"
                    onClick={() => setGuests(Math.max(1, guests - 1))}
                    disabled={guests <= 1}
                  >
                    -
                  </button>
                  <span className="font-bold w-4 text-center">{guests}</span>
                  <button
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50"
                    onClick={() => setGuests(Math.min(hotel?.capacity || 4, guests + 1))}
                    disabled={guests >= (hotel?.capacity || 4)}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Calculate nights and total */}
              {checkIn && checkOut && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm">
                  <div className="flex justify-between text-gray-600 mb-1">
                    <span>
                      {effectiveTab === 'bed' ? Math.round(hotel?.price / (hotel?.capacity || 4)) : hotel?.price}
                      × {Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24))} {lang === 'ar' ? 'ليالي' : 'nights'}
                      {effectiveTab === 'bed' && ` × ${guests} ${lang === 'ar' ? 'معتمرين' : 'guests'}`}
                    </span>
                    <span className="font-bold text-gray-900">
                      {(
                        (effectiveTab === 'bed' ? Math.round(hotel?.price / (hotel?.capacity || 4)) : hotel?.price) *
                        Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)) *
                        (effectiveTab === 'bed' ? guests : 1)
                      ).toLocaleString()} {t('currency')}
                    </span>
                  </div>
                </div>
              )}

              {!isPartial ? (
                <div className="bg-gray-100 p-1 rounded-xl flex text-sm font-bold">
                  <button onClick={() => setEffectiveTab('room')} className={`flex-1 py-2 rounded-lg transition-all ${effectiveTab === 'room' ? 'bg-white shadow-sm text-emerald-900' : 'text-gray-500'}`}>{t('fullRoom')}</button>
                  <button onClick={() => setEffectiveTab('bed')} className={`flex-1 py-2 rounded-lg transition-all ${effectiveTab === 'bed' ? 'bg-white shadow-sm text-emerald-900' : 'text-gray-500'}`}>{t('bedOnly')}</button>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2"><Users size={16} className="mt-0.5 shrink-0" /><div><span className="font-bold">{t('partialBooking')}</span><p className="text-xs mt-1 opacity-80">{t('partialDesc')}</p></div></div>
              )}

              <button
                onClick={() => setShowCheckout(true)}
                disabled={!checkIn || !checkOut || (availability.checked && !availability.available)}
                className={`w-full font-bold text-lg py-3 rounded-xl transition-colors shadow-lg transform active:scale-95 ${(!checkIn || !checkOut || (availability.checked && !availability.available))
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-800 text-white hover:bg-emerald-900'
                  }`}
              >
                {!checkIn || !checkOut ? (lang === 'ar' ? 'اختر التواريخ أولاً' : 'Select dates first') : t('bookNow')}
              </button>
            </div>
          </div>
        </div>
        {showCheckout && <CheckoutFlow hotel={hotel} type={effectiveTab} onClose={() => setShowCheckout(false)} lang={lang} dates={{ checkIn, checkOut, guests }} user={user} onBooked={onBooked} />}
        <MapModal isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} hotel={hotel} lang={lang} />
        <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} url={window.location.href} lang={lang} title={hotel?.name} />
        <RateModal isOpen={isRateOpen} onClose={() => setIsRateOpen(false)} hotel={hotel} user={user} lang={lang} onSuccess={async () => {
          const data = await hotelService.getFeaturedOffers();
          const updated = data.find(h => h.id === hotel.id) || hotel;
          window.location.reload();
        }} />
      </div >
    </>
  );
};

// --- Pilgrim Dashboard ---
const PilgrimNav = ({ activeTab, setActiveTab, lang, t }) => {
  const navItems = [{ id: 'trips', label: t('myTrips'), icon: Briefcase }, { id: 'chats', label: t('chat'), icon: MessageCircle }, { id: 'saved', label: t('saved'), icon: Heart }, { id: 'payments', label: t('paymentHistory'), icon: CreditCard }, { id: 'profile', label: t('profile'), icon: User }];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-2 flex justify-around items-center z-50 md:hidden">
      {navItems.map((item) => (
        <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === item.id ? 'text-emerald-800 bg-emerald-50' : 'text-gray-400'}`}>
          <item.icon size={20} className={activeTab === item.id ? 'fill-current' : ''} />
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

// Sound Helper (Global)
const playNotificationSound = (type = 'receive') => {
  return; // Temporarily disabled due to Pixabay 403 Forbidden errors
};

const BookingCard = ({ booking, lang, t, onOpenChat }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
    <div className="relative h-32 bg-gray-200"><img src={booking.hotel.images[0]} className="w-full h-full object-cover" alt="" /><div className={`absolute top-3 ${lang === 'ar' ? 'left-3' : 'right-3'} px-3 py-1 rounded-full text-xs font-bold bg-white/90 shadow-sm ${booking.status === 'confirmed' ? 'text-green-700' : 'text-amber-700'}`}>{t(booking.status)}</div></div>
    <div className="p-4"><h3 className="font-bold text-gray-900 text-lg">{booking.hotel.name[lang]}</h3><div className="text-xs text-gray-500 mt-1 flex gap-3"><span className="flex items-center gap-1"><CalendarIcon size={12} /> {booking.checkIn}</span><span className="flex items-center gap-1"><ArrowRight size={12} /> {booking.checkOut}</span></div><div className="mt-4 pt-4 border-t border-gray-50"><div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-gray-400 uppercase">{t('roomDetails')}</span><span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2 py-1 rounded">{booking.type === 'bed' ? t('bedOnly') : t('fullRoom')}</span></div>{booking.type === 'bed' && booking.roommates.length > 0 && (<div className="mt-3"><span className="text-xs font-bold text-gray-900 block mb-2">{t('roomMates')}</span><div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">{booking.roommates.map((mate) => (<div key={mate.id} onClick={() => onOpenChat(mate)} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl min-w-[140px] cursor-pointer border border-transparent hover:border-emerald-200 transition-colors"><div className="relative"><img src={mate.img} className="w-8 h-8 rounded-full object-cover" alt="" /><div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div></div><div><div className="text-xs font-bold text-gray-900">{mate.name}</div><div className="text-[9px] text-gray-500">{mate.wilaya}</div></div></div>))}</div></div>)}</div></div>
  </div>
);



// Toast Notification Component
const AppToast = ({ message }) => {
  if (!message) return null;
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-gray-900/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
        <div className="bg-emerald-500 rounded-full p-1"><Check size={12} className="text-white" /></div>
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
};

// Message Notification Toast
const MessageToast = ({ notification, onClick, onDismiss, lang }) => {
  if (!notification) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 flex items-center gap-3 min-w-[280px] hover:shadow-xl transition-shadow">
        {notification?.avatar ? (
          <img
            src={notification.avatar}
            className="w-12 h-12 rounded-full border-2 border-emerald-100 object-cover bg-white"
            alt={notification.from}
          />
        ) : (
          <div className="w-12 h-12 rounded-full border-2 border-emerald-100 bg-emerald-600 text-white flex items-center justify-center text-lg font-bold">
            {(notification?.from === 'User' || !notification?.from) ? 'U' : notification.from.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="text-xs font-bold text-emerald-800 mb-0.5">
            {lang === 'ar' ? 'رسالة جديدة' : 'New Message'}
          </div>
          <div className="text-sm font-medium text-gray-900">
            {lang === 'ar' ? `من ${notification.from}` : `From ${notification.from}`}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={16} className="text-gray-400" />
        </button>
      </div>
    </div >
  );
};

// Message Dropdown Notification Panel
const MessageDropdown = ({ isOpen, onClose, messages, onMarkRead, onOpenChat, lang }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose}></div>

      {/* Dropdown Panel */}
      <div className={`fixed ${lang === 'ar' ? 'left-20' : 'right-20'} top-16 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden`}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">
            {lang === 'ar' ? 'الرسائل الجديدة' : 'New Messages'}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {messages && messages.length > 0 ? (
            messages.map((msg) => (
              <div
                key={msg.id}
                className="p-4 hover:bg-gray-50 border-b border-gray-50 cursor-pointer transition-colors group"
                onClick={() => onOpenChat(msg)}
              >
                <div className="flex items-start gap-3">
                  {msg.sender?.avatar_url ? (
                    <img
                      src={msg.sender.avatar_url}
                      className="w-12 h-12 rounded-full border-2 border-emerald-100 object-cover flex-shrink-0 bg-white"
                      alt={msg.sender?.full_name}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full border-2 border-emerald-100 bg-emerald-600 text-white flex flex-shrink-0 items-center justify-center text-lg font-bold">
                      {(msg.sender?.full_name === 'User' || !msg.sender?.full_name) ? 'U' : msg.sender.full_name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-gray-900 truncate">
                        {msg.sender?.full_name || 'User'}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {new Date(msg.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{msg.content}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkRead(msg.id);
                      }}
                      className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {lang === 'ar' ? '✓ تحديد كمقروءة' : '✓ Mark as read'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <MessageCircle size={48} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-400">
                {lang === 'ar' ? 'ليس لديك رسائل جديدة' : 'No new messages'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const RateModal = ({ isOpen, onClose, hotel, user, lang, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const t = useTranslation(lang);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      await reviewService.addReview({
        user_id: user.id,
        hotel_id: hotel.id,
        offer_id: hotel.offerId,
        rating,
        comment
      });
      toast.error(lang === 'ar' ? 'شكراً لتقييمك!' : 'Thanks for your rating!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{lang === 'ar' ? 'تقييم العرض' : 'Rate Offer'}</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map(star => (
            <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110">
              <Star size={32} className={star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
            </button>
          ))}
        </div>
        <textarea
          className="w-full border border-gray-200 rounded-xl p-3 mb-4 text-sm"
          placeholder={lang === 'ar' ? 'اكتب تعليقك هنا...' : 'Write your review...'}
          rows={3}
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || rating === 0}
          className="w-full bg-emerald-800 text-white rounded-xl py-3 font-bold disabled:opacity-50"
        >
          {loading ? (lang === 'ar' ? 'جار الإرسال...' : 'Submitting...') : (lang === 'ar' ? 'إرسال التقييم' : 'Submit Rating')}
        </button>
      </div>
    </div>
  );
};

const ShareModal = ({ isOpen, onClose, url, lang, title }) => {
  if (!isOpen) return null;
  const t = (key) => {
    const dict = {
      share: { ar: 'مشاركة العرض', en: 'Share Offer' },
      copy: { ar: 'نسخ الرابط', en: 'Copy Link' },
      whatsapp: { ar: 'واتساب', en: 'WhatsApp' },
      facebook: { ar: 'فيسبوك', en: 'Facebook' },
      twitter: { ar: 'تويتر (X)', en: 'Twitter (X)' },
      copied: { ar: 'تم النسخ!', en: 'Copied!' }
    };
    return dict[key]?.[lang] || key;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    onClose(); // Optional: close or show feedback
    toast.error(t('copied'));
  };

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl transform transition-all" onClick={e => e.stopPropagation()} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">{t('share')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X size={20} className="text-gray-500" /></button>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <a href={shareLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group">
            <div className="w-12 h-12 bg-[#25D366]/10 text-[#25D366] rounded-full flex items-center justify-center group-hover:bg-[#25D366] group-hover:text-white transition-all"><MessageCircle size={24} /></div>
            <span className="text-xs font-medium text-gray-600">{t('whatsapp')}</span>
          </a>
          <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group">
            <div className="w-12 h-12 bg-[#1877F2]/10 text-[#1877F2] rounded-full flex items-center justify-center group-hover:bg-[#1877F2] group-hover:text-white transition-all"><Share2 size={24} /></div>
            <span className="text-xs font-medium text-gray-600">{t('facebook')}</span>
          </a>
          <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group">
            <div className="w-12 h-12 bg-black/5 text-black rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all"><span className="font-bold text-xl">X</span></div>
            <span className="text-xs font-medium text-gray-600">{t('twitter')}</span>
          </a>
          <button onClick={handleCopy} className="flex flex-col items-center gap-2 group">
            <div className="w-12 h-12 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center group-hover:bg-gray-200 transition-all"><Copy size={24} /></div>
            <span className="text-xs font-medium text-gray-600">{t('copy')}</span>
          </button>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between text-xs text-gray-500 border border-gray-100">
          <span className="truncate flex-1 font-mono">{url}</span>
          <button onClick={handleCopy} className="ml-2 font-bold text-emerald-600 hover:text-emerald-700">{t('copy')}</button>
        </div>
      </div>
    </div>
  );
};


// Debug Component for Filters
const DebugInfo = ({ filters, count, lang }) => {
  if (process.env.NODE_ENV === 'production') return null; // Only show in dev
  return (
    <div className={`fixed bottom-0 ${lang === 'ar' ? 'right-0' : 'left-0'} z-[200] bg-black/80 text-white p-4 text-xs font-mono rounded-tr-xl opacity-50 hover:opacity-100 transition-opacity`}>
      <div className="font-bold text-emerald-400 mb-1">Filter Debugger</div>
      <div>Results: {count}</div>
      <div className="mt-2 space-y-1">
        <div>City: <span className="text-amber-300">{filters.city}</span></div>
        <div>Name: <span className="text-amber-300">{filters.hotelName || '-'}</span></div>
        <div>Dates: <span className="text-amber-300">{filters.dates?.start || '-'} to {filters.dates?.end || '-'}</span></div>
        <div>Cap: <span className="text-amber-300">{filters.capacity}</span></div>
        <div>Type: <span className="text-amber-300">{filters.type}</span></div>
        <div>Budget: <span className="text-amber-300">{filters.budget}</span></div>
      </div>
    </div>
  );
};

import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailure from './pages/PaymentFailure';

// 14. Main App Entry
export default function TalbiaApp() {
  const [role, setRole] = useState('pilgrim'); // 'pilgrim' | 'admin' | 'partner'
  const [lang, setLang] = useState('ar');

  // Simple Router Logic
  const path = window.location.pathname;
  if (path === '/payment/success') return <PaymentSuccess />;
  if (path === '/payment/failure') return <PaymentFailure />;

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedPageSlug, setSelectedPageSlug] = useState(null);
  const [notification, setNotification] = useState(null); // Toast state

  useEffect(() => { console.log("App Updated: " + new Date().toISOString()); }, []);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [chatUser, setChatUser] = useState(null);
  const [voucher, setVoucher] = useState(null);
  const [isWhatsappOpen, setIsWhatsappOpen] = useState(false);
  const [filters, setFilters] = useState({ city: 'makkah', hotelName: '', dates: { start: null, end: null }, capacity: 'all', type: 'room', budget: 35000 });
  const [messageNotification, setMessageNotification] = useState(null);
  const [initialPilgrimTab, setInitialPilgrimTab] = useState('bookings');
  const [unreadCount, setUnreadCount] = useState(0);
  const t = useTranslation(lang);

  const [user, setUser] = useState(null);
  // Profile state managed by React Query
  // Profile state managed by React Query (synced)
  const [profile, setProfile] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Search State & Strict Hooks
  // Logic Fix 6: Strict Manual Search (No Auto-Search)
  const [searchTriggered, setSearchTriggered] = useState(false);
  const debouncedFilters = useDebounce(filters, 800); // 800ms delay

  // Parallel Fetching: Offers, Profile, Banners
  // Only fetch search if searchTriggered is true
  const { data: searchResults, isLoading: isSearchLoading } = useSearchOffers(searchTriggered ? debouncedFilters : null);

  // Fetch Featured Offers (Background / Initial Load)
  const { data: featuredOffers, isLoading: isFeaturedLoading } = useFeaturedOffers();

  const hotels = searchTriggered ? (searchResults || []) : (featuredOffers || []);
  const loading = searchTriggered ? isSearchLoading : isFeaturedLoading; // Map to existing loading state check

  // Pre-fetch Banners (Parallel)
  useBanners();

  // Use Global Profile Hook (Cached) - Eliminates duplicate fetch
  // Centralized source of truth. DataContext also uses this hook, so cache is shared.
  const { data: fetchedProfile } = useUserProfile(user?.id);

  // Use Favorites Hook (Cached)
  // DISABLE eager fetch in App.jsx to prevent network waterfall on load.
  // It should be fetched only when needed (e.g. in Dashboard or upon interaction).
  const { data: favorites } = useFavorites(user?.id);
  // Ensure we map correctly regardless of casing (service currently returns offerId)
  const favoritesIds = React.useMemo(() => favorites?.map(f => f.offerId || f.offer_id) || [], [favorites]);

  // Sync role and profile state when cached data loads
  useEffect(() => {
    if (fetchedProfile) {
      setProfile(fetchedProfile);
      if (fetchedProfile.role) setRole(fetchedProfile.role);
    }
  }, [fetchedProfile]);

  // Use Global Presence
  const { isUserOnline } = usePresence(user?.id);

  // Message notification subscription
  useEffect(() => {
    if (!user?.id) return;

    const subscription = pilgrimService.subscribeToAllUserMessages(user.id, async (newMessage) => {
      console.log('[App] New message received:', newMessage);
      playNotificationSound('receive');

      // REMOVED: Direct supabase profile fetch (violates strict rules)
      // Simple notification without extra request
      setMessageNotification({
        from: 'New Message', // Could be enhanced with pre-fetched cache
        avatar: null
      });

      // Auto-dismiss after 5 seconds
      setTimeout(() => setMessageNotification(null), 5000);

      // Update unread count
      fetchUnreadCount();
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [user?.id]);

  // Realtime Notifications (Non-Chat)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[App] Realtime Notification:', payload);
          if (payload.new && payload.new.type !== 'chat') {
            // Only play sound — the bell badge handles the visual indicator.
            // We do NOT call showToast() here to avoid covering UI elements (e.g. checkout button).
            playNotificationSound('receive');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, lang]);

  // Fetch unread count - REMOVED: Using cached data from DataContext/TanStack Query
  // The unread count can be derived from the 'chats' data in DataContext
  const fetchUnreadCount = () => {
    // No-op: unread count will be managed by DataContext or derived from cached chats
  };

  // Handlers for navigation
  const handleOpenChats = () => {
    setInitialPilgrimTab('chats');
    setIsProfileOpen(true);
    setMessageNotification(null);
    setUnreadCount(0);
  };

  const handleToastClick = () => {
    handleOpenChats();
  };

  // REMOVED: Duplicate getFavoritesIds fetch. Use cached data from favorites hook/context instead.
  // If needed, use useFavorites hook or get from DataContext.

  const handleToggleFavorite = async (offerId) => {
    console.log('Toggle favorite called with:', offerId, 'User:', user?.id);
    if (!user) {
      console.log('No user, opening auth modal');
      setIsAuthOpen(true);
      return;
    }
    const currentFavs = favoritesIds || [];
    const isFav = currentFavs.includes(offerId);
    console.log('Is favorite (local):', isFav);

    try {
      if (isFav) {
        await bookingService.removeFromFavorites(user.id, offerId);
        showToast(lang === 'ar' ? 'تمت الإزالة من المفضلة' : 'Removed from favorites');
      } else {
        try {
          await bookingService.addToFavorites(user.id, offerId);
          showToast(lang === 'ar' ? 'تم الحفظ في المفضلة' : 'Saved to favorites');
        } catch (err) {
          // Handle Duplicate Key (Already Favorited)
          if (err.code === '23505' || err.status === 409) {
            console.warn('Favorite already exists (409), syncing UI.');
            // Optionally we could just invalidate, but let's assume it succeeded
            showToast(lang === 'ar' ? 'تم الحفظ في المفضلة' : 'Saved to favorites');
          } else {
            throw err;
          }
        }
      }
      // Invalidate to refresh UI
      queryClient.invalidateQueries(['favorites', user.id]);
    } catch (e) {
      console.error('Favorite error:', e);
      showToast(lang === 'ar' ? 'حدث خطأ' : 'Error occured');
    }
  };

  // Initial Load & Auth Check
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await authService.getCurrentSession();
        if (session) {
          setIsLoggedIn(true);
          setUser(session.user);
        }
      } catch (e) {
        console.error("Session check failed", e);
      } finally {
        setLoadingSession(false);
      }
    };

    checkSession();
  }, []);

  // Save Search Effect REMOVED to prevent auto-POST. 
  // Search is now saved only when user explicitly clicks 'Search'.

  const resetSearch = async () => {
    setFilters({ city: 'makkah', hotelName: '', dates: { start: null, end: null }, capacity: 'all', type: 'room', budget: 35000 });
    setSearchTriggered(false);
  };

  // Memoization for Search
  const lastSearchRef = useRef(null);

  const handleSearch = async () => {
    // 0. Double Click Guard
    if (loading) return;

    // 1. Comparison Guard (Strict)
    // We use a simple JSON stringify for the filters object which is stable enough for this use case.
    const currentSearchStr = JSON.stringify(filters);
    const lastSearchStr = JSON.stringify(lastSearchRef.current);

    if (currentSearchStr === lastSearchStr) {
      console.log('Search Memoized: Duplicate params rejected.');
      return;
    }

    console.log("Search triggered");
    setSearchTriggered(true);

    // Manually save search on click
    if (user?.id) {
      // Sanitize payload: capacity 'all' -> null
      const payload = { ...filters, capacity: filters.capacity === 'all' ? null : parseInt(filters.capacity) };
      try {
        await commonService.saveSearch(user.id, payload);
        console.log('Search Saved');
      } catch (error) {
        console.error('Error saving search:', error);
      }
      // Always update reference to prevent duplicate triggers
      lastSearchRef.current = JSON.parse(currentSearchStr);
    }
  };

  const handleLogin = async (email, password, name, isRegistering, avatarFile, phone, state, city, gender) => {
    try {
      if (isRegistering) {
        if (!name || !phone || !state || !gender) {
          toast.error(lang === 'ar' ? 'يرجى تعبئة جميع الحقول المطلوبة (الاسم، الهاتف، الولاية، الجنس)' : 'Please fill all required fields (Name, Phone, State, Gender)');
          return;
        }
        const { user: newUser } = await authService.signUp(email, password, { full_name: name });
        if (newUser) {
          setIsLoggedIn(true);
          setUser(newUser);

          let avatarUrl = null;
          if (avatarFile) {
            try {
              avatarUrl = await authService.uploadAvatar(newUser.id, avatarFile);
            } catch (uErr) {
              console.error("Avatar upload failed", uErr);
              toast.error(lang === 'ar' ? `فشل رفع الصورة: ${uErr.message}` : `Avatar upload failed: ${uErr.message}`);
            }
          }

          // Create or Update Profile (Explicit)
          try {
            await authService.createProfile({
              id: newUser.id,
              full_name: name,
              email: newUser.email,
              role: 'pilgrim',
              avatar_url: avatarUrl,
              phone: phone,
              state: state,
              city: city,
              gender: gender
            });
          } catch (pErr) {
            // Check for duplicate key error (Postgres '23505')
            if (pErr.code === '23505' || pErr.message?.includes('duplicate key')) {
              try {
                await authService.updateProfile(newUser.id, {
                  full_name: name,
                  email: newUser.email,
                  avatar_url: avatarUrl,
                  phone: phone,
                  state: state,
                  city: city,
                  gender: gender
                });
              } catch (uErr) { console.error("Profile update fallback failed", uErr); }
            } else {
              console.error("Profile create failed", pErr);
              toast.error(lang === 'ar' ? `فشل إنشاء الملف الشخصي: ${pErr.message}` : `Profile creation failed: ${pErr.message}`);
            }
          }

          // Fetch created/updated profile
          const p = await authService.getUserProfile(newUser.id);
          // Update Cache directly
          const finalProfile = p || { id: newUser.id, full_name: name, role: 'pilgrim', avatar_url: avatarUrl };
          queryClient.setQueryData(['profile', newUser.id], finalProfile);

          setIsProfileOpen(true);
          setRole('pilgrim');
        } else {
          toast.error(lang === 'ar' ? 'يرجى التحقق من البريد الإلكتروني لتفعيل الحساب' : 'Please check your email to verify account');
        }
      } else {
        const { user: authUser, profile: authProfile } = await authService.signIn(email, password);
        setIsLoggedIn(true);
        setUser(authUser);

        // Update Cache directly
        queryClient.setQueryData(['profile', authUser.id], authProfile);

        if (authProfile?.role) setRole(authProfile.role);
        else setRole('pilgrim'); // Fallback
        setIsProfileOpen(true);
      }
    } catch (e) {
      console.error("Login failed", e);
      toast.error(lang === 'ar' ? 'فشل الدخول: ' + e.message : 'Login Failed: ' + e.message);
    }
  };


  const handleGlobalLogout = async () => {
    try {
      await authService.signOut();
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      setIsLoggedIn(false);
      setUser(null);
      setRole('pilgrim');
      setIsProfileOpen(false);
    }
  };


  if (role === 'admin') return <AdminPanel lang={lang} setLang={setLang} setRole={setRole} onLogout={handleGlobalLogout} onPageClick={setSelectedPageSlug} selectedPageSlug={selectedPageSlug} />;
  if (role === 'partner' || role === 'hotel') return <PartnerPanel lang={lang} setLang={setLang} setRole={setRole} onLogout={handleGlobalLogout} onPageClick={setSelectedPageSlug} selectedPageSlug={selectedPageSlug} />;

  return (
    <DataProvider>
      <div className={`font-sans antialiased text-gray-900 ${THEME.colors.bg}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <GlobalStyles />
        <AppToast message={notification} />
        <MessageToast
          notification={messageNotification}
          onClick={handleToastClick}
          onDismiss={() => setMessageNotification(null)}
          lang={lang}
        />
        <DebugInfo filters={filters} count={hotels.length} lang={lang} />
        {isProfileOpen && isLoggedIn ? (
          <PilgrimPanel
            lang={lang}
            setLang={setLang}
            setRole={setRole}
            user={user}
            profile={profile}
            isUserOnline={isUserOnline}
            onPageClick={setSelectedPageSlug}
            selectedPageSlug={selectedPageSlug}
            initialTab={initialPilgrimTab}
            onClose={() => {
              setIsProfileOpen(false);
              setInitialPilgrimTab('bookings');
            }}
            onSelectHotel={(h) => { setSelectedHotel(h); setIsProfileOpen(false); }}
            onLogout={async () => {
              try {
                await authService.signOut();
              } catch (e) {
                console.error('Pilgrim logout error', e);
              } finally {
                // authService.signOut() clears localStorage. We can smoothly close the panel.
                setIsLoggedIn(false);
                setIsProfileOpen(false);
              }
            }}
            showToast={showToast}
          />
        ) : voucher ? (
          <BookingVoucherPage booking={voucher} onBack={() => { setVoucher(null); setSelectedHotel(null); }} lang={lang} />
        ) : selectedHotel ? (<TripDetails hotel={selectedHotel} onBack={() => setSelectedHotel(null)} lang={lang} user={user} showToast={toast.error} />
        ) : (
          <>
            <Navbar
              role={role}
              setRole={setRole}
              isLoggedIn={isLoggedIn}
              profiles={profile}
              onOpenAuth={() => setIsAuthOpen(true)}
              onOpenProfile={() => setIsProfileOpen(true)}
              onOpenChats={handleOpenChats}
              unreadCount={unreadCount}
              lang={lang}
              setLang={setLang}
            />
            <HomeBanner lang={lang} />
            <div className="bg-stone-50 min-h-screen pb-20">
              <AdvancedSearch filters={filters} setFilters={setFilters} lang={lang} onSearch={handleSearch} setSearchTriggered={setSearchTriggered} onSaveSearch={() => user && commonService.saveSearch(user.id, { ...filters, capacity: filters.capacity === 'all' ? null : parseInt(filters.capacity) })} />
              <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4"><div><h2 className="text-2xl font-bold text-gray-900">{t('recommended')}</h2><p className="text-sm text-gray-500 mt-1">{t('resultsFound', { count: hotels.length })}</p></div><div className="flex gap-2"><button onClick={() => resetSearch()} className="px-4 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center gap-1.5">{lang === 'ar' ? '↺ إعادة تعيين الفلاتر' : '↺ Reset Filters'}</button></div></div>
                {hotels.length > 0 ? (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">{hotels.map((hotel, index) => (<div key={hotel.offerId || `hotel-${index}`} onClick={() => setSelectedHotel(hotel)}><OfferCard offer={hotel} lang={lang} onBook={() => setSelectedHotel(hotel)} /></div>))}</div>) : (<div className="text-center py-20 bg-white rounded-3xl border border-gray-100"><div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400"><Search size={32} /></div><h3 className="text-xl font-bold text-gray-900">{t('noResults')}</h3><button onClick={() => resetSearch()} className="mt-6 text-emerald-800 font-bold hover:underline">{t('resetFilters')}</button></div>)}
              </div>
            </div>
            <Footer lang={lang} onPageClick={(slug) => { setSelectedPageSlug(slug); window.scrollTo(0,0); }} />
          </>
        )}
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onLogin={handleLogin} lang={lang} setLang={setLang} />
        <ChatModal isOpen={!!chatUser} user={chatUser} currentUser={user} onClose={() => setChatUser(null)} lang={lang} isUserOnline={isUserOnline} offerId={chatUser?.offer_id || selectedHotel?.offerId || selectedHotel?.id} />
        <WhatsAppModal isOpen={isWhatsappOpen} onClose={() => setIsWhatsappOpen(false)} lang={lang} />

      </div>
    </DataProvider>
  );
}



