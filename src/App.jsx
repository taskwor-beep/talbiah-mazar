import React, { useState } from 'react';
import { MapPin, Navigation, Car, ShieldCheck, Wallet, Search, Star, X, User } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function App() {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  
  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authType, setAuthType] = useState('pilgrim_login'); // 'pilgrim_login' | 'driver_register' | 'pilgrim_register'
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');

  const mazarat = [
    { name: 'غار حراء', price: '1500', rating: '4.9' },
    { name: 'جبل ثور', price: '1200', rating: '4.8' },
    { name: 'مسجد قباء (المدينة)', price: '800', rating: '5.0' },
  ];

  const openAuthModal = (type) => {
    setAuthType(type);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    // Simulate auth success
    const nameInput = e.target.querySelector('input[type="text"]');
    let defaultName = authType.includes('driver') ? 'كابتن مزار' : 'مستخدم مزار';
    setUserName(nameInput && nameInput.value ? nameInput.value : defaultName);
    setIsLoggedIn(true);
    closeAuthModal();
    toast.success(
      authType === 'pilgrim_login' ? 'تم تسجيل الدخول بنجاح!' : 'تم إنشاء الحساب بنجاح!',
      { position: 'top-center', duration: 4000 }
    );
  };

  return (
    <div className="min-h-screen font-sans text-gray-900 bg-orange-50 selection:bg-orange-200">
      <Toaster />
      
      {/* Navbar */}
      <nav className="absolute top-0 w-full z-40 p-6 flex justify-between items-center max-w-7xl mx-auto left-0 right-0">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-red-600 to-orange-500 p-2 rounded-xl text-white shadow-lg">
            <Navigation size={28} />
          </div>
          <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-700 to-orange-600">
            مزار
          </span>
        </div>
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-orange-100">
              <div className="bg-orange-100 p-1.5 rounded-full text-orange-600">
                <User size={20} />
              </div>
              <span className="font-bold text-gray-800">{userName}</span>
              <button 
                onClick={() => { setIsLoggedIn(false); toast('تم تسجيل الخروج'); }}
                className="text-sm text-red-500 font-bold ml-2 border-l pl-2 border-gray-200 hover:text-red-700 transition"
              >
                خروج
              </button>
            </div>
          ) : (
            <>
              <button 
                onClick={() => openAuthModal('driver_register')}
                className="text-gray-700 font-bold hover:text-orange-600 transition"
              >
                انضم كسائق
              </button>
              <button 
                onClick={() => openAuthModal('pilgrim_login')}
                className="bg-white text-orange-600 px-5 py-2.5 rounded-full font-bold shadow-md hover:shadow-lg transition"
              >
                تسجيل الدخول
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex items-center min-h-[90vh]">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-100 via-yellow-50 to-red-50 -z-10"></div>
        {/* Decorative background blur */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -z-10"></div>
        <div className="absolute top-40 left-10 w-72 h-72 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -z-10"></div>

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center w-full">
          
          <div className="text-right z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-orange-200 text-orange-700 text-sm font-bold mb-6 backdrop-blur-md">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              متوفرون الآن في مكة والمدينة
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-black leading-[1.2] mb-6 text-gray-900">
              رفيقك الموثوق <br />
              في <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-yellow-500">البقاع المقدسة</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-lg">
              خدمة نقل آمنة وسريعة للحجاج والمعتمرين. نوصلك إلى المزارات التاريخية أو أي وجهة تختارها براحة تامة والدفع بالدينار الجزائري.
            </p>

            {/* Search Box */}
            <div className="bg-white p-4 rounded-3xl shadow-[0_20px_50px_rgba(234,88,12,0.1)] border border-orange-100/50 max-w-lg relative z-20">
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <div className="w-4 h-4 rounded-full border-4 border-orange-500"></div>
                  </div>
                  <input 
                    type="text" 
                    placeholder="موقعك الحالي (مثال: فندق أبراج الكسوة)"
                    className="w-full bg-gray-50 border border-gray-100 text-gray-900 rounded-2xl py-4 pr-12 pl-4 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition"
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                  />
                </div>
                
                <div className="relative">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <MapPin className="text-red-500" size={20} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="إلى أين تريد الذهاب؟ (مثال: غار حراء)"
                    className="w-full bg-gray-50 border border-gray-100 text-gray-900 rounded-2xl py-4 pr-12 pl-4 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition"
                    value={dropoff}
                    onChange={(e) => setDropoff(e.target.value)}
                  />
                </div>
                
                <button className="w-full bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold text-lg py-4 rounded-2xl hover:shadow-[0_10px_25px_rgba(234,88,12,0.3)] hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                  <Search size={24} />
                  ابحث عن سائق
                </button>
              </div>
            </div>
          </div>

          <div className="relative z-10 hidden lg:block">
            {/* Abstract Decorative Cards representing rides/destinations */}
            <div className="relative w-full h-[500px]">
              {mazarat.map((place, idx) => (
                <div 
                  key={idx} 
                  className={`absolute bg-white p-5 rounded-3xl shadow-xl border border-gray-50 w-72 backdrop-blur-sm transition-transform hover:scale-105 cursor-pointer
                    ${idx === 0 ? 'top-10 right-0 z-30' : idx === 1 ? 'top-40 left-10 z-20' : 'bottom-10 right-20 z-10'}
                  `}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-orange-100 text-orange-600 p-2 rounded-xl">
                      <MapPin size={24} />
                    </div>
                    <div className="flex items-center text-yellow-500 text-sm font-bold bg-yellow-50 px-2 py-1 rounded-lg">
                      {place.rating} <Star size={14} className="fill-yellow-500 mr-1" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-1">{place.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">رحلة مباشرة مريحة</p>
                  <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                    <span className="text-sm text-gray-500">يبدأ من</span>
                    <span className="text-xl font-black text-red-600">{place.price} <span className="text-sm font-bold">د.ج</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-black mb-4">لماذا تختار مزار؟</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">صممنا خدمتنا خصيصاً لتلبية احتياجات المعتمرين والحجاج بكل أريحية وثقة.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-orange-50 border border-orange-100 hover:-translate-y-2 transition-transform">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-orange-600 mb-6 shadow-sm">
                <Wallet size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">الدفع بالدينار الجزائري</h3>
              <p className="text-gray-600 leading-relaxed">
                لا داعي للقلق حول تحويل العملات. يمكنك الدفع بسهولة وأمان عبر بطاقتك باستخدام Chargily بالدينار الجزائري مباشرة.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-red-50 border border-red-100 hover:-translate-y-2 transition-transform">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-red-600 mb-6 shadow-sm">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">سائقون موثوقون</h3>
              <p className="text-gray-600 leading-relaxed">
                جميع السائقين مسجلون ومعتمدون لضمان أقصى درجات الأمان والراحة خلال تنقلاتك في البقاع المقدسة.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-yellow-50 border border-yellow-100 hover:-translate-y-2 transition-transform">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-yellow-600 mb-6 shadow-sm">
                <Car size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">سيارات مريحة</h3>
              <p className="text-gray-600 leading-relaxed">
                أسطول سيارات حديث ومكيف يتسع للأفراد والعائلات، لضمان راحتك خاصة بعد أداء المناسك.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeAuthModal}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 overflow-hidden">
            {/* Decorative background in modal */}
            <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-r from-red-500 to-orange-500 opacity-10 pointer-events-none"></div>
            
            <button 
              onClick={closeAuthModal}
              className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-700 bg-gray-50 rounded-full transition-colors z-[60]"
            >
              <X size={20} />
            </button>

            <div className="relative z-10">
              <h2 className="text-2xl font-black mb-2 text-gray-900">
                {authType === 'pilgrim_login' ? 'تسجيل دخول المعتمر' : 
                 authType === 'pilgrim_register' ? 'إنشاء حساب معتمر' : 'انضم إلينا كسائق'}
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                {authType === 'pilgrim_login' 
                  ? 'سجل دخولك لحجز رحلتك بكل سهولة وتتبعها.' 
                  : authType === 'pilgrim_register'
                  ? 'أنشئ حساباً جديداً للبدء في طلب سائقك الخاص.'
                  : 'ابدأ بجني الأرباح وتقديم خدمة راقية لضيوف الرحمن.'}
              </p>

              <form className="space-y-4" onSubmit={handleAuthSubmit}>
                {(authType === 'driver_register' || authType === 'pilgrim_register') && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">الاسم الكامل</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                      placeholder="أدخل اسمك الكامل"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">رقم الهاتف</label>
                  <input 
                    type="tel" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition text-left"
                    placeholder="+966 5X XXX XXXX"
                    dir="ltr"
                  />
                </div>

                {authType === 'driver_register' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">نوع السيارة</label>
                    <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition">
                      <option>سيدان (4 ركاب)</option>
                      <option>عائلية (7 ركاب)</option>
                      <option>باص صغير (12 راكب)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">كلمة المرور</label>
                  <input 
                    type="password" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                    placeholder="********"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold text-lg py-3 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all mt-4"
                >
                  {authType === 'pilgrim_login' ? 'دخول' : 'تسجيل حساب جديد'}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-500 relative z-20">
                {authType === 'pilgrim_login' ? (
                  <>ليس لديك حساب؟ <button onClick={() => setAuthType('pilgrim_register')} className="text-orange-600 font-bold hover:underline relative z-30">سجل الآن</button></>
                ) : (
                  <>لديك حساب مسبقاً؟ <button onClick={() => setAuthType('pilgrim_login')} className="text-orange-600 font-bold hover:underline relative z-30">سجل الدخول</button></>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
