import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Settings, List as ListIcon, Check, X, Megaphone, Smartphone, Star, Search, Shield, Save, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import Footer from './Footer';

export default function AdminDashboard({ userName, onLogout, onGoHome }) {
  const [activeTab, setActiveTab] = useState('users');
  
  const [users, setUsers] = useState([]);
  const [driverRequests, setDriverRequests] = useState([]);
  const [offers, setOffers] = useState([]);
  
  const [settings, setSettings] = useState({
    exchange_rate: { sar_to_dzd: 35 },
    social_popup: { is_active: false, title: "تابعنا على المنصات الاجتماعية!", description: "اشترك الآن ليصلك كل جديد عن عروض مزار.", link: "https://twitter.com", frequency: 'once', version: 1 },
    ad_popup: { is_active: true, title: "إعلان هام", description: "احجز باقتك الآن واحصل على خصم 10% بمناسبة الموسم!", image_url: "", frequency: 'always', version: 1 }
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const { data: usersData } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (usersData) setUsers(usersData);

      // Fetch driver requests (status = pending)
      const { data: driversData } = await supabase.from('drivers').select('*, users(full_name, phone_number)').eq('status', 'pending');
      if (driversData) {
        setDriverRequests(driversData.map(d => ({
          id: d.id, name: d.users?.full_name, phone: d.users?.phone_number, vehicle: d.vehicle_type, status: d.status
        })));
      }

      // Fetch offers
      const { data: offersData } = await supabase.from('driver_offers').select('*, drivers(users(full_name))');
      // Fetch packages
      const { data: packagesData } = await supabase.from('driver_packages').select('*, drivers(users(full_name))');

      const combinedOffers = [];
      if (offersData) {
        combinedOffers.push(...offersData.map(o => ({
          id: o.id, type: 'offer', driverName: o.drivers?.users?.full_name, title: o.title, priceDZD: o.price_dzd, details: o.details, status: o.status
        })));
      }
      if (packagesData) {
        combinedOffers.push(...packagesData.map(p => ({
          id: p.id, type: 'package', driverName: p.drivers?.users?.full_name, title: p.title, priceDZD: p.price_dzd, details: p.details, status: p.status
        })));
      }
      setOffers(combinedOffers);

      // Fetch settings
      const { data: settingsData } = await supabase.from('admin_settings').select('*');
      if (settingsData && settingsData.length > 0) {
        const newSettings = { ...settings };
        settingsData.forEach(s => {
          if (newSettings[s.key]) newSettings[s.key] = s.value;
        });
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveDriver = async (id) => {
    const { error } = await supabase.from('drivers').update({ status: 'approved' }).eq('id', id);
    if (!error) {
      setDriverRequests(prev => prev.filter(r => r.id !== id));
      toast.success('تمت الموافقة على السائق بنجاح');
    } else {
      toast.error('حدث خطأ');
    }
  };

  const rejectDriver = async (id) => {
    const { error } = await supabase.from('drivers').update({ status: 'rejected' }).eq('id', id);
    if (!error) {
      setDriverRequests(prev => prev.filter(r => r.id !== id));
      toast.error('تم رفض طلب السائق');
    }
  };

  const approveOffer = async (id, type) => {
    const table = type === 'package' ? 'driver_packages' : 'driver_offers';
    const { error } = await supabase.from(table).update({ status: 'approved' }).eq('id', id);
    if (!error) {
      setOffers(prev => prev.map(o => o.id === id ? { ...o, status: 'approved' } : o));
      toast.success('تمت الموافقة بنجاح');
    }
  };

  const rejectOffer = async (id, type) => {
    const table = type === 'package' ? 'driver_packages' : 'driver_offers';
    const { error } = await supabase.from(table).update({ status: 'rejected' }).eq('id', id);
    if (!error) {
      setOffers(prev => prev.map(o => o.id === id ? { ...o, status: 'rejected' } : o));
      toast.error('تم الرفض');
    }
  };

  const saveSettings = async (key) => {
    const value = settings[key];
    
    // Check if it exists
    const { data } = await supabase.from('admin_settings').select('id').eq('key', key).single();
    
    if (data) {
      await supabase.from('admin_settings').update({ value }).eq('key', key);
    } else {
      await supabase.from('admin_settings').insert([{ key, value }]);
    }
    toast.success('تم حفظ الإعدادات بنجاح');
  };

  const toggleSetting = (key) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: { ...prev[key], is_active: !prev[key].is_active } };
      // Save to DB immediately
      supabase.from('admin_settings').update({ value: updated[key] }).eq('key', key).then(() => {
        toast.success(updated[key].is_active ? 'تم التفعيل' : 'تم الإيقاف');
      });
      return updated;
    });
  };

  const resetCounter = (key) => {
    setSettings(prev => {
      const currentVersion = prev[key].version || 1;
      const updated = { ...prev, [key]: { ...prev[key], version: currentVersion + 1 } };
      supabase.from('admin_settings').update({ value: updated[key] }).eq('key', key).then(() => {
        toast.success('تم تصفير العداد! ستظهر النافذة للجميع مجدداً.');
      });
      return updated;
    });
  };

  const handleSettingChange = (key, field, val) => {
    setSettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: val
      }
    }));
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
                      <td className="p-4 font-bold text-slate-800">{user.full_name}</td>
                      <td className="p-4 text-slate-600" dir="ltr">{user.phone_number}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : user.role === 'driver' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                          {user.role === 'admin' ? 'مدير' : user.role === 'driver' ? 'سائق' : 'معتمر'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
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
                      {offer.type === 'package' && <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-lg text-xs font-bold">باقة مزارات</span>}
                      {offer.type === 'offer' && <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-xs font-bold">عرض توصيل</span>}
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">{offer.title}</h3>
                    <p className="text-slate-500 text-sm mb-4">{offer.details}</p>
                    <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">
                      {offer.priceDZD} د.ج <span className="text-sm font-bold text-slate-400">({(offer.priceDZD / (settings.exchange_rate?.sar_to_dzd || 35)).toFixed(2)} ريال)</span>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    {offer.status === 'pending' ? (
                      <>
                        <button onClick={() => rejectOffer(offer.id, offer.type)} className="flex-1 md:flex-none p-4 bg-slate-100 hover:bg-red-100 hover:text-red-600 text-slate-600 rounded-2xl font-bold transition">
                          <X size={24} />
                        </button>
                        <button onClick={() => approveOffer(offer.id, offer.type)} className="flex-1 md:flex-none px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-bold transition shadow-[0_10px_20px_rgba(34,197,94,0.3)] hover:shadow-[0_15px_30px_rgba(34,197,94,0.4)] hover:-translate-y-1 flex items-center justify-center gap-2">
                          <Check size={24} /> اعتماد 
                        </button>
                      </>
                    ) : (
                      <span className={`px-4 py-2 rounded-xl font-bold ${offer.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {offer.status === 'approved' ? 'تم الاعتماد' : 'مرفوض'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            
            {/* Exchange Rate Setting */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                <span className="bg-green-100 text-green-600 p-2 rounded-xl"><Star size={20} /></span>
                سعر صرف الريال مقابل الدينار
              </h3>
              <div className="flex items-end gap-4 max-w-md">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-500 mb-2">1 ريال سعودي يساوي (بالدينار)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={settings.exchange_rate?.sar_to_dzd || 35} 
                    onChange={e => handleSettingChange('exchange_rate', 'sar_to_dzd', parseFloat(e.target.value))}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-orange-500 font-bold" 
                  />
                </div>
                <button onClick={() => saveSettings('exchange_rate')} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-500 transition flex items-center gap-2">
                  <Save size={20} /> حفظ
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Social Popup Setting */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500"></div>
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                    <Smartphone size={32} />
                  </div>
                  <button 
                    onClick={() => toggleSetting('social_popup')}
                    className={`w-14 h-8 rounded-full flex items-center p-1 transition-colors duration-300 ${settings.social_popup.is_active ? 'bg-green-500' : 'bg-gray-200'}`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${settings.social_popup.is_active ? '-translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
                
                <h3 className="text-2xl font-black text-slate-800 mb-3 relative z-10">نافذة التواصل الاجتماعي</h3>
                <p className="text-slate-500 leading-relaxed relative z-10 mb-6">
                  تفعيل نافذة عصرية متحركة (Animation) تظهر للمستخدمين للحث على الاشتراك في صفحات مزار.
                </p>

                <div className="space-y-4 relative z-10">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">عنوان النافذة</label>
                    <input type="text" value={settings.social_popup.title} onChange={e => handleSettingChange('social_popup', 'title', e.target.value)} className="w-full bg-slate-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">النص الوصفي</label>
                    <textarea value={settings.social_popup.description} onChange={e => handleSettingChange('social_popup', 'description', e.target.value)} className="w-full bg-slate-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none h-16"></textarea>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">رابط الصفحة (Link)</label>
                    <input type="text" value={settings.social_popup.link} onChange={e => handleSettingChange('social_popup', 'link', e.target.value)} className="w-full bg-slate-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">تكرار الظهور</label>
                    <select value={settings.social_popup.frequency || 'once'} onChange={e => handleSettingChange('social_popup', 'frequency', e.target.value)} className="w-full bg-slate-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500">
                      <option value="once">مرة واحدة فقط لكل مستخدم</option>
                      <option value="always">في كل مرة يفتح فيها التطبيق</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveSettings('social_popup')} className="flex-1 bg-blue-50 text-blue-600 font-bold py-2 rounded-lg hover:bg-blue-100 transition flex justify-center items-center gap-2">
                      <Save size={18} /> حفظ
                    </button>
                    <button onClick={() => resetCounter('social_popup')} className="flex-1 bg-purple-50 text-purple-600 font-bold py-2 rounded-lg hover:bg-purple-100 transition flex justify-center items-center gap-2">
                      تصفير العداد
                    </button>
                  </div>
                </div>
                
              </div>

              {/* Ad Popup Setting */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br from-orange-400 to-red-500 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500"></div>
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
                    <Megaphone size={32} />
                  </div>
                  <button 
                    onClick={() => toggleSetting('ad_popup')}
                    className={`w-14 h-8 rounded-full flex items-center p-1 transition-colors duration-300 ${settings.ad_popup.is_active ? 'bg-green-500' : 'bg-gray-200'}`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${settings.ad_popup.is_active ? '-translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
                
                <h3 className="text-2xl font-black text-slate-800 mb-3 relative z-10">نافذة الإعلانات الترويجية</h3>
                <p className="text-slate-500 leading-relaxed relative z-10 mb-6">
                  تفعيل ظهور نوافذ الإعلانات الترويجية للمنصة أو لشركاء مزار في واجهة المعتمرين.
                </p>

                <div className="space-y-4 relative z-10">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">عنوان الإعلان</label>
                    <input type="text" value={settings.ad_popup.title} onChange={e => handleSettingChange('ad_popup', 'title', e.target.value)} className="w-full bg-slate-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">تفاصيل الإعلان</label>
                    <textarea value={settings.ad_popup.description} onChange={e => handleSettingChange('ad_popup', 'description', e.target.value)} className="w-full bg-slate-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500 resize-none h-16"></textarea>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">رابط الصورة (اختياري)</label>
                    <input type="text" value={settings.ad_popup.image_url} onChange={e => handleSettingChange('ad_popup', 'image_url', e.target.value)} className="w-full bg-slate-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500" dir="ltr" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">تكرار الظهور</label>
                    <select value={settings.ad_popup.frequency || 'always'} onChange={e => handleSettingChange('ad_popup', 'frequency', e.target.value)} className="w-full bg-slate-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500">
                      <option value="once">مرة واحدة فقط لكل مستخدم</option>
                      <option value="always">في كل مرة يفتح فيها التطبيق</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveSettings('ad_popup')} className="flex-1 bg-orange-50 text-orange-600 font-bold py-2 rounded-lg hover:bg-orange-100 transition flex justify-center items-center gap-2">
                      <Save size={18} /> حفظ الإعلان
                    </button>
                    <button onClick={() => resetCounter('ad_popup')} className="flex-1 bg-red-50 text-red-600 font-bold py-2 rounded-lg hover:bg-red-100 transition flex justify-center items-center gap-2">
                      تصفير العداد
                    </button>
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-12">
          <Footer />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around p-3 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
         <button onClick={() => setActiveTab('drivers')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'drivers' ? 'text-red-600' : 'text-gray-400'}`}>
           <Users size={24} />
           <span className="text-[10px] font-bold">السائقين</span>
         </button>
         <button onClick={() => setActiveTab('packages')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'packages' ? 'text-red-600' : 'text-gray-400'}`}>
           <Package size={24} />
           <span className="text-[10px] font-bold">الباقات</span>
         </button>
         <button onClick={() => setActiveTab('offers')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'offers' ? 'text-red-600' : 'text-gray-400'}`}>
           <ListIcon size={24} />
           <span className="text-[10px] font-bold">العروض</span>
         </button>
         <button onClick={() => setActiveTab('settings')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-red-600' : 'text-gray-400'}`}>
           <Settings size={24} />
           <span className="text-[10px] font-bold">الإعدادات</span>
         </button>
      </div>
    </div>
  );
}
