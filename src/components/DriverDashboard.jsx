import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, DollarSign, LogOut, Check, X as CloseIcon, Car, Home, List as ListIcon, Wallet, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function DriverDashboard({ userName, onLogout, onGoHome }) {
  const [isOnline, setIsOnline] = useState(true);
  
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ earnings: 0, completedRides: 0, rating: 5.0 });
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'offers'
  
  const [offers, setOffers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [driverId, setDriverId] = useState(null);
  const [driverStatus, setDriverStatus] = useState('approved');
  
  // New Offer State
  const [newOffer, setNewOffer] = useState({ title: '', priceDZD: '', details: '' });
  
  // New Package State (Dynamic steps)
  const [newPackage, setNewPackage] = useState({ 
    title: '', 
    discountDZD: '',
    steps: [{ title: '', startTime: '', endTime: '', priceDZD: '' }] 
  });

  useEffect(() => {
    fetchDriverData();
  }, [userName]);

  const fetchDriverData = async () => {
    // For demo: get driver by user name, or just first driver
    const { data: userData } = await supabase.from('users').select('id').eq('full_name', userName).single();
    let currentDriverId = null;
    
    if (userData) {
      const { data: driverData } = await supabase.from('drivers').select('id, status').eq('user_id', userData.id).single();
      if (driverData) {
        currentDriverId = driverData.id;
        setDriverStatus(driverData.status);
      }
    }
    
    // Fallback if not found
    if (!currentDriverId) {
      const { data: firstDriver } = await supabase.from('drivers').select('id').limit(1).single();
      if (firstDriver) currentDriverId = firstDriver.id;
    }

    if (currentDriverId) {
      setDriverId(currentDriverId);
      
      // Fetch offers
      const { data: offersData } = await supabase.from('driver_offers').select('*').eq('driver_id', currentDriverId);
      if (offersData) setOffers(offersData);
      
      // Fetch packages and steps
      const { data: packagesData } = await supabase.from('driver_packages').select('*, package_steps(*)').eq('driver_id', currentDriverId);
      if (packagesData) setPackages(packagesData);

      // Check for active ride (driver_offered or accepted)
      const { data: activeOrder } = await supabase.from('orders').select('*, users!orders_customer_id_fkey(full_name)').eq('driver_id', currentDriverId).in('status', ['driver_offered', 'accepted']).single();
      if (activeOrder) {
        setActiveRide({
          id: activeOrder.id,
          pickup: activeOrder.pickup_address,
          dropoff: activeOrder.dropoff_address,
          price: activeOrder.total_amount,
          status: activeOrder.status,
          lat: activeOrder.pickup_latitude,
          lng: activeOrder.pickup_longitude,
          customerName: activeOrder.users?.full_name
        });
      } else {
        setActiveRide(null);
        // If no active ride, fetch pending orders for this driver to accept
        const { data: pendingOrders } = await supabase.from('orders').select('*').eq('status', 'pending');
        if (pendingOrders) {
          setRequests(pendingOrders.map(o => ({
            id: o.id,
            pickup: o.pickup_address,
            dropoff: o.dropoff_address,
            price: o.total_amount || 'قابل للتفاوض',
            time: 'الآن',
            lat: o.pickup_latitude,
            lng: o.pickup_longitude
          })));
        } else {
          setRequests([]);
        }
      }

      // Fetch completed orders for stats
      const { data: completedOrders } = await supabase.from('orders').select('total_amount').eq('driver_id', currentDriverId).eq('status', 'delivered');
      if (completedOrders) {
        const totalEarnings = completedOrders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
        setStats({
          earnings: totalEarnings,
          completedRides: completedOrders.length,
          rating: driverData?.rating || 5.0
        });
      }
    }
  };

  // Listen for real-time updates on orders table
  useEffect(() => {
    if (!driverId || !isOnline) return;
    
    // Initial fetch
    fetchDriverData();

    const subscription = supabase
      .channel('driver_orders_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          // Whenever ANY order changes, refreshes the driver's screen (requests & active ride)
          fetchDriverData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [driverId, isOnline]);

  const addOffer = async (e) => {
    e.preventDefault();
    if (!newOffer.title || !newOffer.priceDZD || !driverId) return;
    
    const { data, error } = await supabase.from('driver_offers').insert([{
      driver_id: driverId,
      title: newOffer.title,
      price_dzd: newOffer.priceDZD,
      details: newOffer.details,
      status: 'pending'
    }]).select();

    if (!error && data) {
      setOffers([...offers, data[0]]);
      setNewOffer({ title: '', priceDZD: '', details: '' });
      toast.success('تمت إضافة العرض بنجاح وسيتم مراجعته');
    } else {
      toast.error('حدث خطأ أثناء إضافة العرض');
    }
  };

  const handleStepChange = (index, field, value) => {
    const updatedSteps = [...newPackage.steps];
    updatedSteps[index][field] = value;
    setNewPackage({ ...newPackage, steps: updatedSteps });
  };

  const addStep = () => {
    setNewPackage({
      ...newPackage,
      steps: [...newPackage.steps, { title: '', startTime: '', endTime: '', priceDZD: '' }]
    });
  };

  const removeStep = (index) => {
    const updatedSteps = newPackage.steps.filter((_, i) => i !== index);
    setNewPackage({ ...newPackage, steps: updatedSteps });
  };

  const addPackage = async (e) => {
    e.preventDefault();
    if (!newPackage.title || !driverId || newPackage.steps.length === 0) return;

    // Calculate total price from steps
    const totalPrice = newPackage.steps.reduce((sum, step) => sum + (parseFloat(step.priceDZD) || 0), 0);

    const { data: pkgData, error: pkgError } = await supabase.from('driver_packages').insert([{
      driver_id: driverId,
      title: newPackage.title,
      price_dzd: totalPrice,
      discount_dzd: newPackage.discountDZD || 0,
      status: 'pending'
    }]).select();

    if (pkgData && !pkgError) {
      const packageId = pkgData[0].id;
      
      const stepsToInsert = newPackage.steps.map((step, index) => ({
        package_id: packageId,
        step_order: index + 1,
        title: step.title,
        start_time: step.startTime,
        end_time: step.endTime,
        price_dzd: step.priceDZD
      }));

      await supabase.from('package_steps').insert(stepsToInsert);
      
      toast.success('تمت إضافة الباقة بنجاح بجميع محطاتها!');
      fetchDriverData(); // Refresh to get the new nested data
      setNewPackage({ title: '', discountDZD: '', steps: [{ title: '', startTime: '', endTime: '', priceDZD: '' }] });
    } else {
      toast.error('حدث خطأ أثناء إضافة الباقة');
    }
  };

  const deleteOffer = async (id) => {
    if(!window.confirm('هل أنت متأكد من حذف هذا العرض؟')) return;
    await supabase.from('driver_offers').delete().eq('id', id);
    setOffers(offers.filter(o => o.id !== id));
    toast.success('تم حذف العرض بنجاح');
  };

  const deletePackage = async (id) => {
    if(!window.confirm('هل أنت متأكد من حذف هذه الباقة؟')) return;
    await supabase.from('driver_packages').delete().eq('id', id);
    setPackages(packages.filter(p => p.id !== id));
    toast.success('تم حذف الباقة بنجاح');
  };

  const [activeRide, setActiveRide] = useState(null);

  const acceptRide = async (ride) => {
    if (ride.price !== 'قابل للتفاوض' && ride.price > 0) {
      // It's a pre-priced offer or package, accept directly
      await supabase.from('orders').update({ driver_id: driverId, status: 'accepted' }).eq('id', ride.id);
      toast.success('تم استلام الطلب! انطلق نحو العميل.');
      fetchDriverData();
    } else {
      // Custom ride, prompt for price
      const price = window.prompt('هذا طلب حر. أدخل السعر المقترح لهذه الرحلة (بالدينار الجزائري):');
      if (price && !isNaN(price) && Number(price) > 0) {
        await supabase.from('orders').update({ 
          driver_id: driverId, 
          status: 'driver_offered', 
          total_amount: parseFloat(price) 
        }).eq('id', ride.id);
        toast.success('تم إرسال عرضك للمعتمر! في انتظار موافقته.');
        fetchDriverData();
      } else if (price !== null) {
        toast.error('الرجاء إدخال سعر صحيح.');
      }
    }
  };

  const finishRide = async () => {
    if (activeRide) {
      await supabase.from('orders').update({ status: 'delivered' }).eq('id', activeRide.id);
    }
    setActiveRide(null);
    toast.success('تم إنهاء الرحلة بنجاح. أضيف الرصيد لمحفظتك.');
    fetchDriverData(); // Refresh stats
  };

  const handleWalletClick = () => {
    toast.success('تم إرسال طلب سحب الرصيد إلى الإدارة للمراجعة.');
  };

  if (driverStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans" dir="rtl">
        <div className="bg-white max-w-md w-full rounded-3xl shadow-xl p-8 text-center">
          <div className="w-24 h-24 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Car size={48} />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-4">حسابك قيد المراجعة</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            مرحباً بك في مزار سائق! فريق الإدارة يقوم حالياً بمراجعة طلب انضمامك. ستتمكن من الدخول للوحة التحكم واستقبال الطلبات فور الموافقة على حسابك.
          </p>
          <button onClick={onLogout} className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition">
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900" dir="rtl">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-l border-gray-100 p-6 flex flex-col fixed md:relative z-20 h-full hidden md:flex shadow-sm">
        <div className="flex items-center gap-3 mb-10 cursor-pointer hover:opacity-80 transition" onClick={onGoHome}>
          <div className="bg-gradient-to-br from-gray-800 to-black p-2 rounded-xl text-white shadow-md">
            <Car size={24} />
          </div>
          <span className="text-2xl font-black text-gray-800">مزار سائق</span>
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
           <span className="text-xl font-black text-gray-800 cursor-pointer" onClick={onGoHome}>مزار سائق</span>
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
            <span className="text-3xl font-black text-green-600">{stats.earnings} <span className="text-sm">د.ج</span></span>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center transition hover:-translate-y-1">
            <span className="text-gray-400 text-sm font-bold mb-1">الرحلات المكتملة</span>
            <span className="text-3xl font-black text-gray-800">{stats.completedRides}</span>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center transition hover:-translate-y-1">
            <span className="text-gray-400 text-sm font-bold mb-1">التقييم العام</span>
            <span className="text-3xl font-black text-yellow-500">{stats.rating} ★</span>
          </div>
          <div onClick={handleWalletClick} className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-3xl shadow-md text-white flex flex-col justify-center items-center cursor-pointer hover:shadow-lg transition hover:-translate-y-1">
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
                        <div className="text-sm text-gray-500">{offer.price_dzd} د.ج</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-bold shadow-sm ${offer.status === 'approved' ? 'bg-green-100 text-green-600' : offer.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-white text-orange-600'}`}>
                          {offer.status === 'approved' ? 'مقبول' : offer.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                        </span>
                        <button onClick={() => deleteOffer(offer.id)} className="text-red-400 hover:text-red-600 transition" title="حذف العرض">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Package Form */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><MapPin size={20} className="text-red-500"/> إضافة باقة مزارات (تجمع عدة عروض)</h3>
                <form onSubmit={addPackage} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">اسم الباقة (مثال: باقة مزارات المدينة)</label>
                    <input type="text" value={newPackage.title} onChange={e => setNewPackage({...newPackage, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-red-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">قيمة الخصم بالدينار لمالك الباقة (اختياري)</label>
                    <input type="number" value={newPackage.discountDZD} onChange={e => setNewPackage({...newPackage, discountDZD: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-red-500" placeholder="مثال: 500" />
                    <p className="text-xs text-gray-500 mt-1">إذا أضفت خصماً، سيتم خصمه من مجموع أسعار المحطات لتشجيع العميل.</p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-700 border-b pb-2">محطات الرحلة (المزارات)</h4>
                    {newPackage.steps.map((step, index) => (
                      <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-xl relative group">
                        {index > 0 && (
                          <button type="button" onClick={() => removeStep(index)} className="absolute left-2 top-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">
                            <Trash2 size={18} />
                          </button>
                        )}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">{index + 1}</div>
                          <span className="font-bold text-sm">تفاصيل المحطة</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="md:col-span-2">
                            <input type="text" placeholder="اسم المحطة (مثال: جبل أحد)" value={step.title} onChange={e => handleStepChange(index, 'title', e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500" required />
                          </div>
                          <div>
                            <input type="text" placeholder="وقت البداية (مثال: 08:00 ص)" value={step.startTime} onChange={e => handleStepChange(index, 'startTime', e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500" required />
                          </div>
                          <div>
                            <input type="text" placeholder="وقت النهاية (مثال: 09:30 ص)" value={step.endTime} onChange={e => handleStepChange(index, 'endTime', e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500" required />
                          </div>
                          <div className="md:col-span-2">
                            <input type="number" placeholder="ثمن هذه المحطة بالدينار" value={step.priceDZD} onChange={e => handleStepChange(index, 'priceDZD', e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500" required />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <button type="button" onClick={addStep} className="w-full py-3 border-2 border-dashed border-red-300 text-red-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition">
                      <Plus size={18} /> إضافة محطة أخرى
                    </button>
                    
                    {newPackage.steps.length > 0 && (
                      <div className="bg-red-50 p-4 rounded-xl mt-4 border border-red-100 flex justify-between items-center">
                        <span className="font-bold text-gray-700">المجموع قبل الخصم:</span>
                        <span className="font-black text-xl text-red-600">{newPackage.steps.reduce((sum, step) => sum + (parseFloat(step.priceDZD) || 0), 0)} د.ج</span>
                      </div>
                    )}
                  </div>
                  
                  <button type="submit" className="w-full bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition">تأكيد وإنشاء الباقة</button>
                </form>

                <div className="mt-8 space-y-4">
                  <h4 className="font-bold text-gray-700">باقاتي</h4>
                  {packages.map(pkg => (
                    <div key={pkg.id} className="p-5 bg-red-50 border border-red-100 rounded-2xl relative">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-black text-lg text-gray-800">{pkg.title}</div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-bold shadow-sm ${pkg.status === 'approved' ? 'bg-green-100 text-green-600' : pkg.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-white text-orange-600'}`}>
                            {pkg.status === 'approved' ? 'مقبول' : pkg.status === 'rejected' ? 'مرفوض' : 'مراجعة'}
                          </span>
                          <button onClick={() => deletePackage(pkg.id)} className="text-red-400 hover:text-red-600 transition" title="حذف الباقة">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-4 mt-2">
                        <span className="font-bold">المحطات ({pkg.package_steps?.length || 0}):</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {pkg.package_steps?.map((step, i) => (
                            <span key={step.id} className="bg-white px-2 py-1 rounded-lg text-xs border border-red-100 shadow-sm">
                              {i + 1}. {step.title}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center border-t border-red-200/50 pt-3">
                        <div className="text-xs text-gray-500">
                          {pkg.discount_dzd > 0 && <span className="line-through text-red-300 ml-2">{pkg.price_dzd} د.ج</span>}
                        </div>
                        <span className="font-black text-xl text-red-600">{pkg.price_dzd - (pkg.discount_dzd || 0)} د.ج</span>
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
                {activeRide.status === 'driver_offered' ? 'في انتظار موافقة المعتمر...' : 'رحلة جارية نحو العميل'}
              </h2>
              <span className="bg-orange-100 text-orange-600 font-black px-6 py-2 rounded-2xl text-xl">
                {activeRide.price} د.ج
              </span>
            </div>
            
            <div className="space-y-6 mb-10 bg-gray-50 p-6 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-xl shadow-sm text-gray-500"><MapPin size={24} /></div>
                <div>
                  <div className="text-sm text-gray-400 font-bold mb-1">نقطة الانطلاق (العميل {activeRide.customerName || 'هنا'})</div>
                  <div className="font-black text-lg text-gray-800">{activeRide.pickup}</div>
                  {activeRide.lat && activeRide.lng && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${activeRide.lat},${activeRide.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg mt-2 inline-flex items-center gap-1 hover:bg-blue-100 transition">
                      <MapPin size={12} /> افتح في خرائط جوجل للذهاب
                    </a>
                  )}
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

            {activeRide.status === 'accepted' ? (
              <button onClick={finishRide} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-xl py-5 rounded-2xl shadow-[0_10px_20px_rgba(34,197,94,0.3)] hover:shadow-[0_15px_30px_rgba(34,197,94,0.4)] hover:-translate-y-1 transition">
                إنهاء الرحلة وتحصيل المبلغ
              </button>
            ) : (
              <div className="text-center p-4 bg-orange-50 text-orange-600 rounded-xl font-bold animate-pulse">
                تم عرض السعر ({activeRide.price} د.ج) على المعتمر، يرجى الانتظار حتى يقبل...
              </div>
            )}
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
                      <div className="flex flex-col gap-1 text-gray-600 mb-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-1"><div className="w-3 h-3 rounded-full bg-gray-300"></div></div>
                          <span className="font-bold">{req.pickup}</span>
                        </div>
                        {req.lat && req.lng && (
                          <a href={`https://www.google.com/maps/search/?api=1&query=${req.lat},${req.lng}`} target="_blank" rel="noopener noreferrer" className="mr-6 text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg inline-flex items-center w-fit gap-1 hover:bg-blue-100 transition">
                            <MapPin size={12} /> افتح في خرائط جوجل للذهاب
                          </a>
                        )}
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
