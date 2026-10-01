import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, CreditCard, User, LogOut, CheckCircle2, Navigation2, Home, Search as SearchIcon, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function PilgrimDashboard({ userName, onLogout, onGoHome }) {
  const [rideStatus, setRideStatus] = useState('idle'); // idle, requesting, active
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [pickup, setPickup] = useState('فندق أبراج الكسوة');
  const [dropoff, setDropoff] = useState('');
  const [locationCoords, setLocationCoords] = useState(null);

  const [availablePackages, setAvailablePackages] = useState([]);
  const [availableOffers, setAvailableOffers] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch approved packages with their nested steps and driver details
    const { data, error } = await supabase
      .from('driver_packages')
      .select(`
        *,
        package_steps(*),
        drivers(users(full_name))
      `)
      .eq('status', 'approved');
      
    if (data && !error) {
      const mappedPackages = data.map(pkg => ({
        id: pkg.id,
        driverName: pkg.drivers?.users?.full_name || 'سائق مزار',
        title: pkg.title,
        totalPrice: pkg.price_dzd - (pkg.discount_dzd || 0),
        originalPrice: pkg.price_dzd,
        details: pkg.details || 'باقة تشمل عدة محطات',
        steps: pkg.package_steps?.sort((a,b) => a.step_order - b.step_order).map(step => ({
          id: step.id,
          title: step.title,
          startTime: step.start_time,
          endTime: step.end_time,
          price: step.price_dzd
        })) || []
      }));
      setAvailablePackages(mappedPackages);
    }

    const { data: offersData } = await supabase
      .from('driver_offers')
      .select('*, drivers(users(full_name))')
      .eq('status', 'approved');
      
    if (offersData) {
      setAvailableOffers(offersData);
    }
  };

  const handleRequestRide = async (type = 'search', predefinedData = null) => {
    let finalPickup = pickup;
    let finalDropoff = dropoff;
    let price = Math.floor(Math.random() * 500) + 500;
    
    if (type !== 'search' && predefinedData) {
       finalPickup = predefinedData.pickup;
       finalDropoff = predefinedData.dropoff;
       price = predefinedData.price;
    }

    if (!finalPickup || !finalDropoff) return toast.error('يرجى تحديد نقطة الانطلاق والوجهة');
    
    setRideStatus('requesting');
    
    // Get real user ID
    const { data: userData } = await supabase.from('users').select('id').eq('full_name', userName).single();
    
    if (userData) {
      await supabase.from('orders').insert([{
        customer_id: userData.id,
        pickup_address: finalPickup,
        dropoff_address: finalDropoff,
        status: 'pending',
        total_amount: price,
        pickup_latitude: locationCoords?.lat,
        pickup_longitude: locationCoords?.lng
      }]);
    }

    setTimeout(() => {
      setRideStatus('active');
      toast.success('تم رفع طلبك ووصل للسائقين!');
    }, 2000);
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      toast.loading('جاري تحديد موقعك...', { id: 'loc' });
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocationCoords({ lat, lng });
          setPickup(`موقعي الحالي (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          toast.success('تم تحديد موقعك بدقة!', { id: 'loc' });
        },
        (error) => {
          toast.error('لم نتمكن من تحديد موقعك، يرجى تفعيل الـ GPS', { id: 'loc' });
        }
      );
    } else {
      toast.error('متصفحك لا يدعم تحديد الموقع');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900" dir="rtl">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-l border-gray-100 p-6 flex flex-col fixed md:relative z-20 h-full hidden md:flex shadow-sm">
        <div className="flex items-center gap-3 mb-10 cursor-pointer hover:opacity-80 transition" onClick={onGoHome}>
          <div className="bg-gradient-to-br from-red-600 to-orange-500 p-2 rounded-xl text-white shadow-md">
            <Navigation size={24} />
          </div>
          <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-700 to-orange-600">مزار</span>
        </div>

        <nav className="flex-1 space-y-2">
          <a href="#" className="flex items-center gap-3 p-3 bg-orange-50 text-orange-600 rounded-xl font-bold transition">
            <Home size={20} /> حجز رحلة
          </a>
          <a href="#" className="flex items-center gap-3 p-3 text-gray-500 hover:bg-gray-50 rounded-xl font-bold transition">
            <Clock size={20} /> رحلاتي السابقة
          </a>
          <a href="#" className="flex items-center gap-3 p-3 text-gray-500 hover:bg-gray-50 rounded-xl font-bold transition">
            <CreditCard size={20} /> طرق الدفع
          </a>
          <a href="#" className="flex items-center gap-3 p-3 text-gray-500 hover:bg-gray-50 rounded-xl font-bold transition">
            <Settings size={20} /> الإعدادات
          </a>
        </nav>

        <div className="pt-6 border-t border-gray-100 mt-auto">
          <div className="flex items-center gap-3 mb-4 p-2">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500">
              <User size={20} />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-800 truncate w-32">{userName}</p>
              <p className="text-xs text-gray-500 font-bold">معتمر / حاج</p>
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
           <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-700 to-orange-600 cursor-pointer" onClick={onGoHome}>مزار</span>
           <button onClick={onLogout} className="text-red-500"><LogOut size={20} /></button>
        </div>

        <h1 className="text-2xl font-black text-gray-800 hidden md:block mb-8">لوحة التحكم الخاصة بك</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Main Action Area */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedPackage ? (
            <>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
              <h2 className="text-2xl font-black mb-6 text-gray-800">أين وجهتك القادمة؟</h2>
              
              {rideStatus === 'idle' && (
                <div className="space-y-4">
                  <div className="relative flex gap-2 items-center">
                    <div className="relative flex-1">
                      <div className="absolute right-4 top-1/2 -translate-y-1/2"><div className="w-4 h-4 rounded-full border-4 border-orange-500"></div></div>
                      <input type="text" value={pickup} onChange={e => setPickup(e.target.value)} className="w-full bg-gray-50 rounded-2xl py-4 pr-12 pl-4 border border-gray-200 focus:border-orange-500 outline-none text-gray-800 font-bold transition" />
                    </div>
                    <button onClick={handleGetLocation} className="bg-orange-100 text-orange-600 p-4 rounded-2xl hover:bg-orange-200 transition" title="تحديد موقعي">
                      <Navigation size={24} />
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500"><MapPin size={20} /></div>
                    <input type="text" value={dropoff} onChange={e => setDropoff(e.target.value)} placeholder="غار حراء، مسجد قباء..." className="w-full bg-gray-50 rounded-2xl py-4 pr-12 pl-4 border border-gray-200 focus:border-red-500 outline-none text-gray-800 font-bold transition" />
                  </div>
                  <button onClick={() => handleRequestRide('search')} className="w-full bg-gradient-to-r from-red-600 to-orange-500 text-white font-black text-lg py-4 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all mt-4 flex items-center justify-center gap-2">
                    <SearchIcon size={24} /> تأكيد الحجز والبحث عن سائق
                  </button>
                  <p className="text-center text-sm font-bold text-gray-400 mt-2">الدفع يتم بأمان عبر Chargily</p>
                </div>
              )}

              {rideStatus === 'requesting' && (
                <div className="py-16 flex flex-col items-center justify-center text-orange-600">
                  <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 border-4 border-orange-200 rounded-full animate-ping opacity-75"></div>
                    <div className="absolute inset-0 border-4 border-t-orange-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center"><Navigation size={32} className="text-orange-500" /></div>
                  </div>
                  <p className="font-black text-xl animate-pulse">جاري البحث عن أفضل سائق لك...</p>
                </div>
              )}

              {rideStatus === 'active' && (
                <div className="bg-orange-50 p-8 rounded-3xl border border-orange-200 ring-4 ring-orange-50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-500"></div>
                  <h3 className="font-black text-xl mb-6 text-gray-800 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                    السائق في طريقه إليك
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-6 items-center bg-white p-6 rounded-2xl shadow-sm mb-6">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center shadow-inner">
                      <User className="text-gray-400" size={40} />
                    </div>
                    <div className="flex-1 text-center sm:text-right">
                      <h3 className="font-black text-2xl text-gray-800 mb-1">السائق عمر</h3>
                      <p className="text-gray-500 font-bold mb-2">تويوتا كامري - س ع د 1234</p>
                      <div className="text-yellow-500 font-black flex items-center justify-center sm:justify-start gap-1">★ 4.9 <span className="text-gray-400 text-sm font-normal">(128 رحلة)</span></div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-xl text-center border border-orange-100">
                      <div className="text-xs text-orange-600 font-bold mb-1">الوقت المتوقع</div>
                      <div className="text-2xl font-black text-gray-800 flex items-center gap-1">5 <span className="text-sm">دقائق</span></div>
                    </div>
                  </div>
                  <button onClick={() => setRideStatus('idle')} className="w-full bg-red-100 text-red-600 font-black py-4 rounded-2xl hover:bg-red-200 hover:shadow-sm transition">
                    إلغاء الطلب
                  </button>
                </div>
              )}
            </div>

            {/* Offers Section */}
            {rideStatus === 'idle' && availableOffers.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-black mb-4 text-gray-800">أحدث عروض التوصيل المباشرة</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {availableOffers.map(offer => (
                    <div key={offer.id} className="bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-md transition hover:-translate-y-1 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-1 h-full bg-blue-500"></div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">عرض توصيل</span>
                        <span className="text-xs text-gray-400 font-bold bg-gray-50 px-2 py-1 rounded-lg">السائق {offer.drivers?.users?.full_name}</span>
                      </div>
                      <h3 className="font-black text-xl text-gray-800 mb-2">{offer.title}</h3>
                      <p className="text-gray-500 text-sm mb-4 leading-relaxed">{offer.details}</p>
                      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                        <span className="font-black text-blue-600 text-lg">{offer.price_dzd} د.ج</span>
                        <button onClick={() => {
                          handleRequestRide('offer', { pickup: 'موقعي الحالي', dropoff: offer.title, price: offer.price_dzd });
                        }} className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 hover:shadow-lg transition">طلب التوصيلة</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Packages Section */}
            {rideStatus === 'idle' && availablePackages.length > 0 && (
              <div>
                <h2 className="text-2xl font-black mb-4 text-gray-800">أو اختر من الباقات الجاهزة (جولات كاملة)</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {availablePackages.map(pkg => (
                    <div 
                      key={pkg.id} 
                      onClick={() => setSelectedPackage(pkg)}
                      className="bg-gradient-to-br from-red-50 to-orange-50 border border-orange-100 rounded-3xl p-6 cursor-pointer hover:-translate-y-1 hover:shadow-md transition group relative overflow-hidden"
                    >
                      <div className="absolute -left-10 -top-10 w-32 h-32 bg-orange-500 rounded-full opacity-5 group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="flex justify-between items-start mb-2 relative z-10">
                        <span className="bg-white text-orange-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm">باقة سائق</span>
                      </div>
                      <h3 className="font-black text-xl text-gray-800 mb-1 relative z-10">{pkg.title}</h3>
                      <p className="text-gray-500 text-sm mb-4 relative z-10">{pkg.details}</p>
                      
                      <div className="flex items-center justify-between border-t border-orange-200/50 pt-4 relative z-10">
                        <div>
                          <p className="text-xs text-gray-400 line-through">{pkg.originalPrice} د.ج</p>
                          <p className="font-black text-red-600 text-lg">{pkg.totalPrice} د.ج</p>
                        </div>
                        <div className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform">
                          <Navigation2 size={16} className="-rotate-90" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </>
            ) : (
              // Selected Package Detail View
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
                <button onClick={() => setSelectedPackage(null)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-700 transition">
                  <User size={24} className="hidden" /> {/* Placeholder for back icon if needed */}
                  <span className="font-bold border-b border-gray-400">العودة</span>
                </button>
                
                <h2 className="text-3xl font-black mb-2 text-gray-800">{selectedPackage.title}</h2>
                <p className="text-gray-500 mb-8">{selectedPackage.details} - بواسطة {selectedPackage.driverName}</p>
                
                <div className="bg-gray-50 p-6 rounded-3xl mb-10 border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-gray-400 text-sm font-bold">الثمن الإجمالي للرحلة</p>
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-black text-red-600">{selectedPackage.totalPrice} د.ج</span>
                        <span className="text-gray-400 line-through mb-1">{selectedPackage.originalPrice} د.ج</span>
                      </div>
                    </div>
                    <div className="bg-green-100 text-green-600 px-4 py-2 rounded-xl font-black text-sm border border-green-200">
                      توفير {selectedPackage.originalPrice - selectedPackage.totalPrice} د.ج!
                    </div>
                  </div>
                  <button onClick={() => {
                    handleRequestRide('package', { pickup: 'جولة سياحية', dropoff: selectedPackage.title, price: selectedPackage.totalPrice });
                  }} className="w-full bg-gradient-to-r from-red-600 to-orange-500 text-white font-black text-lg py-4 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
                    حجز الباقة الآن
                  </button>
                </div>

                <h3 className="font-black text-xl text-gray-800 mb-6">مسار الرحلة والمحطات</h3>
                
                <div className="relative pl-6">
                  {/* Timeline Line */}
                  <div className="absolute right-6 top-6 bottom-6 w-1 bg-gradient-to-b from-orange-500 to-red-500 rounded-full opacity-20 hidden md:block"></div>
                  
                  <div className="space-y-6 relative">
                    {selectedPackage.steps.map((step, idx) => (
                      <div key={step.id} className="relative flex flex-col md:flex-row gap-6 md:items-stretch group">
                        
                        {/* Timeline Node */}
                        <div className="hidden md:flex flex-col items-center">
                          <div className="w-12 h-12 rounded-full bg-white border-4 border-orange-100 flex items-center justify-center z-10 group-hover:border-orange-500 transition-colors shadow-sm">
                            <span className="font-black text-orange-500">{idx + 1}</span>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="flex-1 bg-white border border-gray-100 p-6 rounded-3xl shadow-sm group-hover:shadow-md transition-shadow relative overflow-hidden">
                          {idx !== selectedPackage.steps.length - 1 && (
                             <div className="absolute left-1/2 -bottom-4 w-8 h-8 md:hidden text-orange-300">
                               <Navigation2 size={24} className="rotate-180 mx-auto" />
                             </div>
                          )}
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-black text-xl text-gray-800">{step.title}</h4>
                            <span className="text-orange-600 font-bold bg-orange-50 px-3 py-1 rounded-xl text-sm">{step.price} د.ج</span>
                          </div>
                          
                          <div className="flex items-center gap-6 text-sm font-bold text-gray-500">
                            <div className="flex items-center gap-2">
                              <Clock size={16} className="text-gray-400" /> من {step.startTime}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock size={16} className="text-gray-400" /> إلى {step.endTime}
                            </div>
                          </div>
                        </div>
                        
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Side Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2 text-lg">
                <Clock size={24} className="text-orange-500" />
                رحلاتي السابقة
              </h3>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-orange-200 transition">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-black text-gray-800">إلى: جبل ثور</span>
                    <span className="text-green-600 font-bold text-xs bg-green-100 px-2 py-1 rounded">مكتملة</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-sm font-bold">
                    <span>الأمس</span>
                    <span className="text-gray-800">1200 د.ج</span>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-orange-200 transition">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-black text-gray-800">إلى: محطة قطار الحرمين</span>
                    <span className="text-green-600 font-bold text-xs bg-green-100 px-2 py-1 rounded">مكتملة</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-sm font-bold">
                    <span>منذ 3 أيام</span>
                    <span className="text-gray-800">3500 د.ج</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer">
              <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <CreditCard size={120} className="-mr-4 -mb-4" />
              </div>
              <h3 className="font-black mb-2 relative z-10 text-lg">طريقة الدفع الافتراضية</h3>
              <p className="text-orange-100 font-bold text-sm mb-6 relative z-10">مدعوم بواسطة Chargily</p>
              <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between relative z-10 border border-white/20">
                <span className="font-mono tracking-widest font-bold">**** 1234</span>
                <CheckCircle2 size={24} />
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
