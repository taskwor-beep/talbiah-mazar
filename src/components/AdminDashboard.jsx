import React, { useState } from 'react';
import { Users, UserPlus, Settings, List as ListIcon, Check, X, Megaphone, Smartphone, Star, Search, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboard({ userName, onLogout, onGoHome }) {
  const [activeTab, setActiveTab] = useState('users');
  
  // Mock Data
  const [users, setUsers] = useState([
    { id: 1, name: 'أحمد علي', phone: '+966500000001', role: 'pilgrim', date: '2026-10-01' },
    { id: 2, name: 'محمد خالد', phone: '+213500000002', role: 'driver', date: '2026-10-01' },
  ]);

  const [driverRequests, setDriverRequests] = useState([
    { id: 101, name: 'سعيد عبدلله', phone: '+966500000003', vehicle: 'سيدان (4 ركاب)', status: 'pending' },
    { id: 102, name: 'عمر حسن', phone: '+213500000004', vehicle: 'عائلية (7 ركاب)', status: 'pending' },
  ]);

  const [offers, setOffers] = useState([
    { id: 201, driverName: 'محمد خالد', title: 'توصيل للمطار', priceDZD: 4000, details: 'سيارة مريحة ومكيفة', status: 'pending' },
    { id: 202, driverName: 'علي رضا', title: 'باقة المزارات الكاملة', priceDZD: 12000, details: 'تشمل غار حراء ومسجد قباء', status: 'pending' }
  ]);

  const [settings, setSettings] = useState({
    socialPopupActive: false,
    adPopupActive: true,
  });

  const approveDriver = (id) => {
    setDriverRequests(prev => prev.filter(r => r.id !== id));
    toast.success('تمت الموافقة على السائق بنجاح');
  };

  const rejectDriver = (id) => {
    setDriverRequests(prev => prev.filter(r => r.id !== id));
    toast.error('تم رفض طلب السائق');
  };

  const approveOffer = (id) => {
    setOffers(prev => prev.filter(o => o.id !== id));
    toast.success('تمت الموافقة على العرض');
  };

  const rejectOffer = (id) => {
    setOffers(prev => prev.filter(o => o.id !== id));
    toast.error('تم رفض العرض');
  };

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success('تم تحديث الإعدادات');
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col hidden md:flex shadow-xl z-20 h-screen sticky top-0">
        <div className="flex items-center gap-3 mb-10 cursor-pointer hover:opacity-80 transition" onClick={onGoHome}>
          <div className="bg-gradient-to-br from-red-600 to-orange-500 p-2 rounded-xl text-white shadow-md">
            <Shield size={24} />
          </div>
          <span className="text-2xl font-black">الإدارة المركزية</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition ${activeTab === 'users' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Users size={20} /> المسجلون
          </button>
          <button 
            onClick={() => setActiveTab('drivers')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition ${activeTab === 'drivers' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <UserPlus size={20} /> طلبات السائقين
            {driverRequests.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full mr-auto">{driverRequests.length}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('offers')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition ${activeTab === 'offers' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <ListIcon size={20} /> عروض السائقين
            {offers.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full mr-auto">{offers.length}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition ${activeTab === 'settings' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Settings size={20} /> الإعدادات والنوافذ
          </button>
        </nav>

        <div className="pt-6 border-t border-slate-700 mt-auto">
          <div className="flex items-center gap-3 mb-4 p-2">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-slate-300">
              <Shield size={20} />
            </div>
            <div>
              <p className="font-bold text-sm truncate w-32">{userName}</p>
              <p className="text-xs text-orange-400 font-bold">مدير النظام</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 p-3 bg-slate-800 hover:bg-red-600 text-white rounded-xl font-bold transition">
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 h-screen overflow-y-auto bg-slate-50">
        {/* Mobile Header */}
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-3xl shadow-sm border border-gray-100 md:hidden">
           <span className="text-xl font-black text-slate-800 flex items-center gap-2"><Shield size={20} className="text-orange-500"/> الإدارة</span>
           <button onClick={onLogout} className="text-slate-500"><X size={24} /></button>
        </div>

        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            {activeTab === 'users' && 'المسجلون في المنصة'}
            {activeTab === 'drivers' && 'مراجعة طلبات انضمام السائقين'}
            {activeTab === 'offers' && 'مراجعة عروض السائقين'}
            {activeTab === 'settings' && 'إعدادات النوافذ المنبثقة والإعلانات'}
          </h1>
          <p className="text-slate-500">مرحباً بك في لوحة تحكم الإدارة المركزية لمزار.</p>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-lg">قائمة المستخدمين</h2>
              <div className="relative">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="بحث..." className="pl-4 pr-10 py-2 bg-slate-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 text-slate-500 text-sm">
                  <tr>
                    <th className="p-4 font-bold">الاسم</th>
                    <th className="p-4 font-bold">رقم الهاتف</th>
                    <th className="p-4 font-bold">الدور</th>
                    <th className="p-4 font-bold">تاريخ التسجيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-bold text-slate-800">{user.name}</td>
                      <td className="p-4 text-slate-600" dir="ltr">{user.phone}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'driver' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                          {user.role === 'driver' ? 'سائق' : 'معتمر'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 text-sm">{user.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Drivers Tab */}
        {activeTab === 'drivers' && (
          <div className="space-y-6">
            {driverRequests.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-gray-300">
                <UserPlus size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">لا توجد طلبات انضمام جديدة حالياً.</p>
              </div>
            ) : (
              driverRequests.map(req => (
                <div key={req.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                      <UserPlus size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800">{req.name}</h3>
                      <p className="text-slate-500 flex gap-4 mt-1 text-sm">
                        <span dir="ltr">{req.phone}</span>
                        <span>•</span>
                        <span>{req.vehicle}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => rejectDriver(req.id)} className="flex-1 md:flex-none px-6 py-3 bg-slate-100 hover:bg-red-100 hover:text-red-600 text-slate-600 rounded-xl font-bold transition flex items-center justify-center gap-2">
                      <X size={20} /> رفض
                    </button>
                    <button onClick={() => approveDriver(req.id)} className="flex-1 md:flex-none px-6 py-3 bg-slate-900 hover:bg-orange-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2">
                      <Check size={20} /> قبول السائق
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Offers Tab */}
        {activeTab === 'offers' && (
          <div className="space-y-6">
            {offers.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-gray-300">
                <ListIcon size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">لا توجد عروض جديدة للمراجعة.</p>
              </div>
            ) : (
              offers.map(offer => (
                <div key={offer.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-2 h-full bg-orange-400"></div>
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold">سائق: {offer.driverName}</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">{offer.title}</h3>
                    <p className="text-slate-500 text-sm mb-4">{offer.details}</p>
                    <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">
                      {offer.priceDZD} د.ج <span className="text-sm font-bold text-slate-400">({(offer.priceDZD * 0.028).toFixed(2)} ريال)</span>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => rejectOffer(offer.id)} className="flex-1 md:flex-none p-4 bg-slate-100 hover:bg-red-100 hover:text-red-600 text-slate-600 rounded-2xl font-bold transition">
                      <X size={24} />
                    </button>
                    <button onClick={() => approveOffer(offer.id)} className="flex-1 md:flex-none px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-bold transition shadow-[0_10px_20px_rgba(34,197,94,0.3)] hover:shadow-[0_15px_30px_rgba(34,197,94,0.4)] hover:-translate-y-1 flex items-center justify-center gap-2">
                      <Check size={24} /> اعتماد العرض
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Social Popup Setting */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500"></div>
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                  <Smartphone size={32} />
                </div>
                <button 
                  onClick={() => toggleSetting('socialPopupActive')}
                  className={`w-14 h-8 rounded-full flex items-center p-1 transition-colors duration-300 ${settings.socialPopupActive ? 'bg-green-500' : 'bg-gray-200'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${settings.socialPopupActive ? '-translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
              
              <h3 className="text-2xl font-black text-slate-800 mb-3 relative z-10">نافذة التواصل الاجتماعي</h3>
              <p className="text-slate-500 leading-relaxed relative z-10">
                تفعيل نافذة عصرية متحركة (Animation) تظهر للمستخدمين للحث على الاشتراك في صفحات مزار على وسائل التواصل الاجتماعي.
              </p>
              
              {settings.socialPopupActive && (
                <div className="mt-6 inline-flex items-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-xl text-sm font-bold relative z-10">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  النافذة مفعلة وتظهر للزوار
                </div>
              )}
            </div>

            {/* Ad Popup Setting */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br from-orange-400 to-red-500 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500"></div>
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
                  <Megaphone size={32} />
                </div>
                <button 
                  onClick={() => toggleSetting('adPopupActive')}
                  className={`w-14 h-8 rounded-full flex items-center p-1 transition-colors duration-300 ${settings.adPopupActive ? 'bg-green-500' : 'bg-gray-200'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${settings.adPopupActive ? '-translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
              
              <h3 className="text-2xl font-black text-slate-800 mb-3 relative z-10">نوافذ الإعلانات</h3>
              <p className="text-slate-500 leading-relaxed relative z-10">
                تفعيل ظهور نوافذ الإعلانات الترويجية للمنصة أو لشركاء مزار في واجهة المعتمرين لزيادة التفاعل.
              </p>
              
              {settings.adPopupActive && (
                <div className="mt-6 inline-flex items-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-xl text-sm font-bold relative z-10">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  الإعلانات مفعلة حالياً
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
