import React, { useState } from 'react';
import { MapPin, Navigation, Clock, CreditCard, User, LogOut, CheckCircle2, Navigation2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PilgrimDashboard({ userName, onLogout }) {
  const [rideStatus, setRideStatus] = useState('idle'); // idle, requesting, active

  const handleRequestRide = () => {
    setRideStatus('requesting');
    toast('جاري البحث عن أقرب سائق...', { icon: '🔍' });
    setTimeout(() => {
      setRideStatus('active');
      toast.success('تم العثور على الكابتن عمر!');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900" dir="rtl">
      {/* Topbar */}
      <header className="bg-white p-4 shadow-sm flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-red-600 to-orange-500 p-1.5 rounded-lg text-white">
            <Navigation size={24} />
          </div>
          <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-700 to-orange-600">مزار</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-bold text-gray-700 hidden sm:block">أهلاً بك، {userName}</span>
          <button onClick={onLogout} className="p-2 text-gray-500 hover:text-red-500 transition rounded-full bg-gray-50">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 md:p-6 grid lg:grid-cols-3 gap-6">
        
        {/* Main Action Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
            <h2 className="text-2xl font-bold mb-4">أين وجهتك القادمة؟</h2>
            
            {rideStatus === 'idle' && (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2"><div className="w-3 h-3 rounded-full border-2 border-orange-500"></div></div>
                  <input type="text" defaultValue="فندق أبراج الكسوة" className="w-full bg-gray-50 rounded-xl py-3 pr-10 pl-4 border border-gray-200 focus:border-orange-500 outline-none" />
                </div>
                <div className="relative">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500"><MapPin size={18} /></div>
                  <input type="text" placeholder="غار حراء، مسجد قباء..." className="w-full bg-gray-50 rounded-xl py-3 pr-10 pl-4 border border-gray-200 focus:border-red-500 outline-none" />
                </div>
                <button onClick={handleRequestRide} className="w-full bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold py-3 rounded-xl hover:shadow-lg transition">
                  تأكيد الحجز (دفع بـ Chargily)
                </button>
              </div>
            )}

            {rideStatus === 'requesting' && (
              <div className="py-10 flex flex-col items-center justify-center text-orange-600">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
                <p className="font-bold animate-pulse">جاري البحث عن كابتن بالقرب منك...</p>
              </div>
            )}

            {rideStatus === 'active' && (
              <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200 flex flex-col sm:flex-row gap-6 items-center">
                <div className="flex-1 w-full space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow">
                      <User className="text-gray-400" size={32} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">الكابتن عمر</h3>
                      <p className="text-gray-600 text-sm">تويوتا كامري - س ع د 1234</p>
                      <div className="text-yellow-500 text-sm font-bold flex items-center mt-1">★ 4.9</div>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl flex items-center justify-between shadow-sm">
                    <span className="text-gray-600 font-bold">الوقت المتوقع: 5 دقائق</span>
                    <Navigation2 className="text-orange-500 animate-bounce" />
                  </div>
                  <button onClick={() => setRideStatus('idle')} className="w-full bg-red-100 text-red-600 font-bold py-2 rounded-xl hover:bg-red-200 transition">
                    إلغاء الطلب
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-orange-500" />
              رحلاتي السابقة
            </h3>
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-bold text-gray-800">إلى: جبل ثور</span>
                  <span className="text-green-600 font-bold text-sm bg-green-50 px-2 py-1 rounded">مكتملة</span>
                </div>
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>الأمس</span>
                  <span className="font-bold text-gray-700">1200 د.ج</span>
                </div>
              </div>
              <div className="pb-2">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-bold text-gray-800">إلى: محطة قطار الحرمين</span>
                  <span className="text-green-600 font-bold text-sm bg-green-50 px-2 py-1 rounded">مكتملة</span>
                </div>
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>منذ 3 أيام</span>
                  <span className="font-bold text-gray-700">3500 د.ج</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10">
              <CreditCard size={100} />
            </div>
            <h3 className="font-bold mb-1 relative z-10">طريقة الدفع</h3>
            <p className="text-orange-100 text-sm mb-4 relative z-10">بواسطة Chargily</p>
            <div className="bg-white/20 backdrop-blur-md p-3 rounded-xl flex items-center justify-between relative z-10">
              <span>**** **** **** 1234</span>
              <CheckCircle2 size={18} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
