import React, { useState } from 'react';
import { MapPin, Navigation, DollarSign, LogOut, Check, X as CloseIcon, Car, Home, List as ListIcon, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DriverDashboard({ userName, onLogout, onGoHome }) {
  const [isOnline, setIsOnline] = useState(true);
  
  const [requests, setRequests] = useState([
    { id: 1, pickup: 'فندق سويس أوتيل', dropoff: 'مسجد قباء', price: '800', time: 'يبعد 2 دقيقة' },
    { id: 2, pickup: 'حي العزيزية', dropoff: 'محطة قطار الحرمين', price: '3500', time: 'يبعد 5 دقائق' },
  ]);
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'offers'
  
  const [offers, setOffers] = useState([
    { id: 1, title: 'توصيل للمطار', priceDZD: 4000, details: 'سيارة مريحة ومكيفة 4 ركاب', image: '' }
  ]);
  const [packages, setPackages] = useState([
    { id: 1, title: 'باقة المزارات الشاملة', priceDZD: 12000, discountDZD: 1000, offers: [1], details: 'غار حراء، جبل ثور، مسجد قباء' }
  ]);
  
  // New Offer State
  const [newOffer, setNewOffer] = useState({ title: '', priceDZD: '', details: '', image: '' });
  // New Package State
  const [newPackage, setNewPackage] = useState({ title: '', priceDZD: '', discountDZD: '', details: '', offers: [] });

  const addOffer = (e) => {
    e.preventDefault();
    if (!newOffer.title || !newOffer.priceDZD) return;
    setOffers([...offers, { ...newOffer, id: Date.now() }]);
    setNewOffer({ title: '', priceDZD: '', details: '', image: '' });
    toast.success('تمت إضافة العرض بنجاح وسيتم مراجعته');
  };

  const addPackage = (e) => {
    e.preventDefault();
    if (!newPackage.title || !newPackage.priceDZD) return;
    setPackages([...packages, { ...newPackage, id: Date.now() }]);
    setNewPackage({ title: '', priceDZD: '', discountDZD: '', details: '', offers: [] });
    toast.success('تمت إضافة الباقة بنجاح');
  };

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
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900" dir="rtl">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-l border-gray-100 p-6 flex flex-col fixed md:relative z-20 h-full hidden md:flex shadow-sm">
        <div className="flex items-center gap-3 mb-10 cursor-pointer hover:opacity-80 transition" onClick={onGoHome}>
          <div className="bg-gradient-to-br from-gray-800 to-black p-2 rounded-xl text-white shadow-md">
            <Car size={24} />
          </div>
          <span className="text-2xl font-black text-gray-800">مزار كابتن</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition ${activeTab === 'home' ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Home size={20} /> الرئيسية
          </button>
          <button onClick={() => setActiveTab('offers')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition ${activeTab === 'offers' ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:bg-gray-50'}`}>
            <ListIcon size={20} /> عروضي وباقاتي
          </button>
          <button className="w-full flex items-center gap-3 p-3 text-gray-500 hover:bg-gray-50 rounded-xl font-bold transition">
            <Wallet size={20} /> المحفظة
          </button>
        </nav>

        <div className="pt-6 border-t border-gray-100 mt-auto">
          <div className="flex items-center gap-3 mb-4 p-2">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
              <Car size={20} />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-800 truncate w-32">{userName}</p>
              <p className="text-xs text-green-500 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> نشط الآن
              </p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 rounded-xl font-bold transition">
            <LogOut size={20} /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 p-4 md:p-8 h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-3xl shadow-sm border border-gray-100 md:hidden">
           <span className="text-xl font-black text-gray-800 cursor-pointer" onClick={onGoHome}>مزار كابتن</span>
           <button onClick={onLogout} className="text-red-500"><LogOut size={20} /></button>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-black text-gray-800 hidden md:block">لوحة التحكم</h1>
          <div className="flex items-center gap-2 bg-white p-1 rounded-full shadow-sm border border-gray-100 mr-auto">
            <span className={`text-sm font-bold px-4 py-2 rounded-full transition cursor-pointer ${!isOnline ? 'bg-gray-100 text-gray-800 shadow-inner' : 'text-gray-400 hover:text-gray-600'}`} onClick={() => setIsOnline(false)}>غير متصل</span>
            <span className={`text-sm font-bold px-4 py-2 rounded-full transition cursor-pointer ${isOnline ? 'bg-green-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`} onClick={() => setIsOnline(true)}>متصل للطلبات</span>
          </div>
        </div>

        {/* Earnings Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center transition hover:-translate-y-1">
            <span className="text-gray-400 text-sm font-bold mb-1">أرباح اليوم</span>
            <span className="text-3xl font-black text-green-600">4,700 <span className="text-sm">د.ج</span></span>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center transition hover:-translate-y-1">
            <span className="text-gray-400 text-sm font-bold mb-1">الرحلات المكتملة</span>
            <span className="text-3xl font-black text-gray-800">5</span>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center transition hover:-translate-y-1">
            <span className="text-gray-400 text-sm font-bold mb-1">التقييم العام</span>
            <span className="text-3xl font-black text-yellow-500">4.9 ★</span>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-3xl shadow-md text-white flex flex-col justify-center items-center cursor-pointer hover:shadow-lg transition hover:-translate-y-1">
            <DollarSign size={28} className="mb-2 opacity-90" />
            <span className="font-bold text-lg">سحب الرصيد</span>
          </div>
        </div>

        {activeTab === 'offers' && (
          <div className="space-y-8 pb-10">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-gray-800 mb-2">إدارة عروضي وباقاتي</h2>
              <p className="text-gray-500">قم بإضافة عروض التوصيل الخاصة بك وباقات المزارات ليراها المعتمرون.</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Add Offer Form */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Car size={20} className="text-orange-500"/> إضافة عرض توصيل جديد</h3>
                <form onSubmit={addOffer} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">اسم العرض (مثال: توصيل المطار)</label>
                    <input type="text" value={newOffer.title} onChange={e => setNewOffer({...newOffer, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-orange-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">الثمن بالدينار الجزائري</label>
                    <input type="number" value={newOffer.priceDZD} onChange={e => setNewOffer({...newOffer, priceDZD: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-orange-500" required />
                    {newOffer.priceDZD && (
                      <p className="text-xs text-green-600 mt-1 font-bold">يظهر للمعتمر: ≈ {(newOffer.priceDZD * 0.028).toFixed(2)} ريال سعودي</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">التفاصيل (اختياري)</label>
                    <textarea value={newOffer.details} onChange={e => setNewOffer({...newOffer, details: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-orange-500 resize-none h-20"></textarea>
                  </div>
                  <button type="submit" className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition">إضافة العرض</button>
                </form>

                <div className="mt-8 space-y-4">
                  <h4 className="font-bold text-gray-700">عروضي الحالية</h4>
                  {offers.map(offer => (
                    <div key={offer.id} className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex justify-between items-center">
                      <div>
                        <div className="font-bold text-gray-800">{offer.title}</div>
                        <div className="text-sm text-gray-500">{offer.priceDZD} د.ج</div>
                      </div>
                      <span className="text-xs bg-white text-orange-600 px-2 py-1 rounded-full font-bold shadow-sm">قيد المراجعة</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Package Form */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><MapPin size={20} className="text-red-500"/> إضافة باقة مزارات (تجمع عدة عروض)</h3>
                <form onSubmit={addPackage} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">اسم الباقة (مثال: باقة مزارات المدينة)</label>
                    <input type="text" value={newPackage.title} onChange={e => setNewPackage({...newPackage, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-red-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">الثمن الكلي للباقة بالدينار</label>
                    <input type="number" value={newPackage.priceDZD} onChange={e => setNewPackage({...newPackage, priceDZD: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-red-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">قيمة الخصم بالدينار (اختياري)</label>
                    <input type="number" value={newPackage.discountDZD} onChange={e => setNewPackage({...newPackage, discountDZD: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-red-500" placeholder="مثال: 500" />
                    {newPackage.discountDZD && newPackage.priceDZD && (
                      <p className="text-xs text-red-500 mt-1 font-bold">الثمن بعد الخصم: {newPackage.priceDZD - newPackage.discountDZD} د.ج</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">تفاصيل المحطات</label>
                    <textarea value={newPackage.details} onChange={e => setNewPackage({...newPackage, details: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-red-500 resize-none h-20" placeholder="اذكر المزارات وترتيبها"></textarea>
                  </div>
                  <button type="submit" className="w-full bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition">إنشاء الباقة</button>
                </form>

                <div className="mt-8 space-y-4">
                  <h4 className="font-bold text-gray-700">باقاتي</h4>
                  {packages.map(pkg => (
                    <div key={pkg.id} className="p-4 bg-red-50 border border-red-100 rounded-xl">
                      <div className="font-bold text-gray-800">{pkg.title}</div>
                      <div className="text-sm text-gray-600 mb-2">{pkg.details}</div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 line-through">{pkg.priceDZD} د.ج</span>
                        <span className="font-black text-red-600">{pkg.priceDZD - (pkg.discountDZD || 0)} د.ج</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'home' && (
          <>
        {!isOnline ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
              <Car size={48} />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-3">أنت غير متصل حالياً</h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">قم بتغيير حالتك إلى "متصل للطلبات" من الأعلى لتبدأ باستقبال طلبات التوصيل الجديدة.</p>
            <button onClick={() => setIsOnline(true)} className="bg-green-500 text-white px-10 py-4 rounded-full font-bold shadow-md hover:shadow-lg hover:-translate-y-1 transition text-lg">
              اتصل الآن لاستقبال الطلبات
            </button>
          </div>
        ) : activeRide ? (
          <div className="bg-white rounded-3xl p-8 shadow-md border-2 border-orange-400 ring-8 ring-orange-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-500"></div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                <div className="w-4 h-4 bg-green-500 rounded-full animate-ping"></div>
                رحلة جارية نحو العميل
              </h2>
              <span className="bg-orange-100 text-orange-600 font-black px-6 py-2 rounded-2xl text-xl">
                {activeRide.price} د.ج
              </span>
            </div>
            
            <div className="space-y-6 mb-10 bg-gray-50 p-6 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-xl shadow-sm text-gray-500"><MapPin size={24} /></div>
                <div>
                  <div className="text-sm text-gray-400 font-bold mb-1">نقطة الانطلاق (العميل هنا)</div>
                  <div className="font-black text-lg text-gray-800">{activeRide.pickup}</div>
                </div>
              </div>
              <div className="border-r-2 border-dashed border-gray-300 h-8 mr-6"></div>
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-xl shadow-sm text-red-500"><Navigation size={24} /></div>
                <div>
                  <div className="text-sm text-gray-400 font-bold mb-1">وجهة النزول</div>
                  <div className="font-black text-lg text-gray-800">{activeRide.dropoff}</div>
                </div>
              </div>
            </div>

            <button onClick={finishRide} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-xl py-5 rounded-2xl shadow-[0_10px_20px_rgba(34,197,94,0.3)] hover:shadow-[0_15px_30px_rgba(34,197,94,0.4)] hover:-translate-y-1 transition">
              إنهاء الرحلة وتحصيل المبلغ
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="font-black text-gray-800 text-xl flex items-center gap-2">
              الطلبات المتاحة حولك <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm">{requests.length}</span>
            </h2>
            
            {requests.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl text-center text-gray-400 border border-gray-100 border-dashed">
                <div className="animate-pulse w-16 h-16 mx-auto mb-4 opacity-50"><Navigation size={64} /></div>
                <p className="text-lg">جاري البحث عن طلبات قريبة منك...</p>
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-6">
                {requests.map((req) => (
                  <div key={req.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between gap-6 hover:shadow-lg hover:-translate-y-1 transition">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-orange-500 font-bold text-sm bg-orange-50 px-3 py-1 rounded-lg flex items-center gap-1"><Navigation size={14}/> {req.time}</span>
                        <span className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">{req.price} د.ج</span>
                      </div>
                      <div className="flex items-start gap-3 text-gray-600 mb-3">
                        <div className="mt-1"><div className="w-3 h-3 rounded-full bg-gray-300"></div></div>
                        <span className="font-bold">{req.pickup}</span>
                      </div>
                      <div className="flex items-start gap-3 text-gray-800">
                        <MapPin size={16} className="text-red-500 mt-0.5" />
                        <span className="font-black">{req.dropoff}</span>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-auto">
                      <button className="bg-gray-50 p-4 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition">
                        <CloseIcon size={24} />
                      </button>
                      <button onClick={() => acceptRide(req)} className="flex-1 bg-gray-900 text-white font-black px-6 py-4 rounded-2xl hover:bg-black hover:shadow-lg transition flex items-center justify-center gap-2 text-lg">
                        <Check size={24} /> قبول الطلب
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </>
        )}

      </main>
    </div>
  );
}
