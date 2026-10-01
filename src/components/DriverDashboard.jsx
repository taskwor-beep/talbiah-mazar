import React, { useState } from 'react';
import { MapPin, Navigation, DollarSign, LogOut, Check, X as CloseIcon, Car } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DriverDashboard({ userName, onLogout }) {
  const [isOnline, setIsOnline] = useState(true);
  
  const [requests, setRequests] = useState([
    { id: 1, pickup: 'فندق سويس أوتيل', dropoff: 'مسجد قباء', price: '800', time: 'يبعد 2 دقيقة' },
    { id: 2, pickup: 'حي العزيزية', dropoff: 'محطة قطار الحرمين', price: '3500', time: 'يبعد 5 دقائق' },
  ]);
  const [activeRide, setActiveRide] = useState(null);

  const acceptRide = (ride) => {
    setActiveRide(ride);
    setRequests([]);
    toast.success('تم استلام الطلب! انطلق نحو العميل.');
  };

  const finishRide = () => {
    setActiveRide(null);
    toast.success('تم إنهاء الرحلة بنجاح. أضيف الرصيد لمحفظتك.');
    // Add dummy request back after 3 seconds
    setTimeout(() => {
      setRequests([{ id: 3, pickup: 'سوبر ماركت بن داود', dropoff: 'غار حراء', price: '1500', time: 'يبعد 1 دقيقة' }]);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900" dir="rtl">
      {/* Topbar */}
      <header className="bg-white p-4 shadow-sm flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-gray-800 to-black p-2 rounded-xl text-white">
            <Car size={24} />
          </div>
          <div>
            <span className="text-lg font-black block leading-none text-gray-800">مزار كابتن</span>
            <span className="text-xs text-gray-500 font-bold">{userName}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-full">
            <span className={`text-xs font-bold px-3 py-1 rounded-full transition ${!isOnline ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`} onClick={() => setIsOnline(false)}>غير متصل</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full transition cursor-pointer ${isOnline ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500'}`} onClick={() => setIsOnline(true)}>متصل</span>
          </div>
          <button onClick={onLogout} className="text-gray-400 hover:text-red-500 transition">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Earnings Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
            <span className="text-gray-500 text-sm font-bold mb-1">أرباح اليوم</span>
            <span className="text-2xl font-black text-green-600">4,700 <span className="text-sm">د.ج</span></span>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
            <span className="text-gray-500 text-sm font-bold mb-1">الرحلات المكتملة</span>
            <span className="text-2xl font-black text-gray-800">5</span>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
            <span className="text-gray-500 text-sm font-bold mb-1">التقييم العام</span>
            <span className="text-2xl font-black text-yellow-500">4.9 ★</span>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl shadow-sm text-white flex flex-col justify-center items-center">
            <DollarSign size={24} className="mb-1 opacity-80" />
            <span className="font-bold text-sm">سحب الرصيد</span>
          </div>
        </div>

        {/* Main Area */}
        {!isOnline ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Car size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">أنت غير متصل</h2>
            <p className="text-gray-500 mb-6">قم بتغيير حالتك إلى "متصل" لتبدأ باستقبال طلبات التوصيل الجديدة.</p>
            <button onClick={() => setIsOnline(true)} className="bg-green-500 text-white px-8 py-3 rounded-full font-bold shadow-md hover:bg-green-600 transition">
              اتصل الآن
            </button>
          </div>
        ) : activeRide ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-orange-200 ring-4 ring-orange-50">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                رحلة جارية
              </h2>
              <span className="bg-orange-100 text-orange-600 font-black px-4 py-2 rounded-xl text-lg">
                {activeRide.price} د.ج
              </span>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-2 rounded-full text-gray-500"><MapPin size={20} /></div>
                <div>
                  <div className="text-xs text-gray-500">من</div>
                  <div className="font-bold">{activeRide.pickup}</div>
                </div>
              </div>
              <div className="border-r-2 border-dashed border-gray-200 h-6 mr-5"></div>
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-full text-red-500"><Navigation size={20} /></div>
                <div>
                  <div className="text-xs text-gray-500">إلى</div>
                  <div className="font-bold">{activeRide.dropoff}</div>
                </div>
              </div>
            </div>

            <button onClick={finishRide} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:shadow-xl transition">
              إنهاء الرحلة
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-800 text-lg">الطلبات المتاحة ({requests.length})</h2>
            
            {requests.length === 0 ? (
              <div className="bg-white p-10 rounded-3xl text-center text-gray-400 border border-gray-100 border-dashed">
                <div className="animate-pulse w-12 h-12 mx-auto mb-3 opacity-50"><Navigation size={48} /></div>
                <p>جاري البحث عن طلبات قريبة منك...</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 hover:shadow-md transition">
                  <div className="w-full sm:w-auto flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-orange-500 font-bold text-sm bg-orange-50 px-2 py-1 rounded">{req.time}</span>
                      <span className="font-black text-lg text-gray-800">{req.price} د.ج</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div> {req.pickup}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-800 font-bold">
                      <MapPin size={14} className="text-red-500" /> {req.dropoff}
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <button className="bg-gray-100 p-3 rounded-xl text-gray-500 hover:bg-gray-200 transition">
                      <CloseIcon size={24} />
                    </button>
                    <button onClick={() => acceptRide(req)} className="flex-1 sm:flex-none bg-black text-white font-bold px-8 py-3 rounded-xl hover:bg-gray-800 transition flex items-center justify-center gap-2">
                      <Check size={20} /> قبول
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
