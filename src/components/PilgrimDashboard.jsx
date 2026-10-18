import React, { useState, useEffect } from 'react';
import { 
  MapPin, Navigation, Clock, CreditCard, User, LogOut, CheckCircle2, 
  Navigation2, Home, Search as SearchIcon, Settings, Wallet, Download, 
  Bell, ChevronDown, Check, Building, ShieldCheck, AlertCircle, Calendar, 
  RefreshCw, Phone, MessageCircle, Car, Info, Sparkles, CheckCircle, ArrowRight, ExternalLink,
  Pencil, Save, X, Mail
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import Footer from './Footer';
import RideMap from './RideMap';
import { playNewOrderAlert, playSuccessChime, playCancelChime } from '../lib/sound';
import { setOneSignalRole, requestNotificationPermission, sendPushNotification, showExternalNotification } from '../lib/onesignal';
import { DESTINATIONS_DB } from '../lib/destinations';
import { getReliablePosition } from '../lib/geo';

export default function PilgrimDashboard({ userName: initialUserName, userId: propUserId, onLogout, onGoHome, onUpdateUserName }) {
  const [userName, setUserName] = useState(initialUserName || '');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState(propUserId || localStorage.getItem('userId') || null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: initialUserName || '',
    phone_number: '',
    email: '',
    hotel: 'فندق أبراج الكسوة'
  });

  const [activeTab, setActiveTab] = useState('book'); // 'book', 'history', 'payment', 'settings'
  const [rideStatus, setRideStatus] = useState('idle'); // idle, requesting, active
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [pickup, setPickup] = useState('فندق أبراج الكسوة');
  const [dropoff, setDropoff] = useState('');
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [isSelectingDropoff, setIsSelectingDropoff] = useState(false);
  const [destCityTab, setDestCityTab] = useState('makkah');
  const [destCategory, setDestCategory] = useState('all');
  const [destSearchQuery, setDestSearchQuery] = useState('');
  const [locationCoords, setLocationCoords] = useState(null);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [offeredRide, setOfferedRide] = useState(null);
  const [currentOrderType, setCurrentOrderType] = useState('search');
  const [driverLiveCoords, setDriverLiveCoords] = useState(null);

  const [availablePackages, setAvailablePackages] = useState([]);
  const [availableOffers, setAvailableOffers] = useState([]);
  const [pastTrips, setPastTrips] = useState([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);

  useEffect(() => {
    if (initialUserName && initialUserName !== userName) {
      setUserName(initialUserName);
      setEditForm(prev => ({ ...prev, full_name: initialUserName }));
    }
  }, [initialUserName]);

  useEffect(() => {
    const currentUserId = propUserId || userId || localStorage.getItem('userId');
    setOneSignalRole('pilgrim', userName, currentUserId);
    requestNotificationPermission();
    fetchUserProfile();

    // Check if returning from Chargily checkout
    const urlParams = new URLSearchParams(window.location.search);
    const pStatus = urlParams.get('payment_status');
    const orderIdParam = urlParams.get('order_id') || localStorage.getItem('mazar_pending_chargily_order_id') || localStorage.getItem('mazar_active_order_id');

    if (pStatus === 'success' && orderIdParam) {
      // 1. Immediately switch UI state to prevent seeing the payment options again
      setCurrentOrderId(orderIdParam);
      setRideStatus('active');
      localStorage.setItem('mazar_active_order_id', orderIdParam);
      localStorage.removeItem('mazar_pending_chargily_order_id');
      toast.success('تم الدفع بنجاح عبر Chargily! السائق في طريقه إليك 🚗💳', { duration: 7000 });

      // 2. Update Supabase order and fetch confirmed order details directly
      (async () => {
        try {
          const { error: updErr } = await supabase.from('orders').update({
            status: 'accepted',
            payment_method: 'card',
            payment_status: 'paid'
          }).eq('id', orderIdParam);
          if (updErr) console.warn('Order status update warning:', updErr);

          // Direct fetch of the confirmed order
          const { data: updatedOrder } = await supabase.from('orders')
            .select('*, drivers(users(full_name, phone_number))')
            .eq('id', orderIdParam)
            .maybeSingle();

          if (updatedOrder) {
            setCurrentOrderId(updatedOrder.id);
            setOfferedRide(updatedOrder);
            setPickup(updatedOrder.pickup_address);
            setDropoff(updatedOrder.dropoff_address);
            setRideStatus('active');

            if (updatedOrder.driver_id) {
              supabase.from('drivers').select('user_id').eq('id', updatedOrder.driver_id).maybeSingle().then(({ data: dUser }) => {
                sendPushNotification({
                  title: '🎉 تم دفع الرحلة إلكترونياً وقبولها!',
                  message: `قام المعتمر ${userName || ''} بدفع قيمة الرحلة إلكترونياً (${updatedOrder.total_amount} د.ج). توجه لنقطة الانطلاق!`,
                  targetDriverId: updatedOrder.driver_id,
                  targetUserId: dUser?.user_id,
                  targetRole: 'driver',
                  targetUrl: '/'
                }).catch(console.error);
              });
            }
          }
        } catch (e) {
          console.error('Error confirming payment redirect:', e);
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname);
          fetchData(orderIdParam);
          fetchPastTrips();
        }
      })();
    } else if (pStatus === 'failed') {
      toast.error('لم تكتمل عملية الدفع الإلكتروني. يمكنك المحاولة مجدداً أو اختيار الدفع نقداً.');
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchData();
      fetchPastTrips();
    } else {
      fetchData();
      fetchPastTrips();
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const searchName = userName || initialUserName;
      if (!searchName) return;
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('full_name', searchName)
        .limit(1)
        .maybeSingle();

      if (userData) {
        setUserId(userData.id);
        setUserName(userData.full_name);
        setUserPhone(userData.phone_number || '');
        setUserEmail(userData.email || '');
        setEditForm({
          full_name: userData.full_name || '',
          phone_number: userData.phone_number || '',
          email: userData.email || '',
          hotel: pickup || 'فندق أبراج الكسوة'
        });
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!editForm.full_name.trim()) {
      return toast.error('يرجى إدخال الاسم الكامل');
    }

    setIsSavingProfile(true);
    const toastId = toast.loading('جاري حفظ بيانات الملف الشخصي...');

    try {
      const trimmedName = editForm.full_name.trim();
      const trimmedPhone = editForm.phone_number.trim();
      const trimmedEmail = editForm.email.trim();
      const trimmedHotel = editForm.hotel.trim();

      let targetId = userId;

      if (!targetId) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('full_name', userName)
          .limit(1)
          .maybeSingle();

        if (existingUser) {
          targetId = existingUser.id;
        }
      }

      if (targetId) {
        const { error } = await supabase
          .from('users')
          .update({
            full_name: trimmedName,
            phone_number: trimmedPhone || null,
            email: trimmedEmail || null
          })
          .eq('id', targetId);

        if (error) throw error;
      } else {
        const { data: newUser, error } = await supabase
          .from('users')
          .insert([{
            full_name: trimmedName,
            phone_number: trimmedPhone || '0500000000',
            email: trimmedEmail || null,
            role: 'pilgrim'
          }])
          .select()
          .single();

        if (error) throw error;
        if (newUser) {
          targetId = newUser.id;
          setUserId(newUser.id);
        }
      }

      setUserName(trimmedName);
      setUserPhone(trimmedPhone);
      setUserEmail(trimmedEmail);
      if (trimmedHotel) {
        setPickup(trimmedHotel);
      }

      localStorage.setItem('userName', trimmedName);
      if (onUpdateUserName) {
        onUpdateUserName(trimmedName);
      }

      setIsEditingProfile(false);
      toast.success('تم تحديث ملفك الشخصي بنجاح! ✨', { id: toastId });
      fetchPastTrips();
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast.error('حدث خطأ أثناء حفظ الملف الشخصي: ' + err.message, { id: toastId });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const fetchPastTrips = async () => {
    setIsLoadingTrips(true);
    try {
      const { data: userData } = await supabase.from('users').select('id').eq('full_name', userName).limit(1).maybeSingle();
      if (!userData) {
        setIsLoadingTrips(false);
        return;
      }
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          pickup_address,
          dropoff_address,
          status,
          total_amount,
          payment_method,
          payment_status,
          drivers (
            users (
              full_name,
              phone_number
            )
          )
        `)
        .eq('customer_id', userData.id)
        .order('created_at', { ascending: false });

      if (data && !error) {
        setPastTrips(data);
      }
    } catch (err) {
      console.error('Failed to load past trips:', err);
    } finally {
      setIsLoadingTrips(false);
    }
  };


  const handleTestBackgroundNotification = async () => {
    await requestNotificationPermission();
    toast.success('تم جدولة إشعار تجريبي خلال 3 ثوانٍ! أغلق التطبيق أو اقفل الشاشة الآن 📲', { duration: 4000 });
    setTimeout(() => {
      sendPushNotification({
        title: 'مزار - تجربة إشعار الخلفية 🔔',
        message: 'التنبيهات تعمل بنجاح في الخلفية حتى بعد إغلاق التطبيق! 🚗✨',
        targetRole: null,
        targetUrl: '/'
      });
    }, 3000);
  };

  const fetchData = async (forcedOrderId = null) => {
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

    // Restore active order
    const targetOrderId = forcedOrderId || currentOrderId || localStorage.getItem('mazar_active_order_id');
    let foundActiveOrder = null;

    if (targetOrderId) {
      const { data: directOrder } = await supabase.from('orders')
        .select('*, drivers(users(full_name, phone_number))')
        .eq('id', targetOrderId)
        .maybeSingle();
      if (directOrder && ['pending', 'pending_driver_approval', 'driver_offered', 'accepted', 'picking_up', 'in_transit'].includes(directOrder.status)) {
        foundActiveOrder = directOrder;
      }
    }

    if (!foundActiveOrder) {
      const currentName = userName || initialUserName;
      if (currentName) {
        const { data: userData } = await supabase.from('users').select('id').eq('full_name', currentName).limit(1).maybeSingle();
        if (userData) {
          const { data: activeOrder } = await supabase.from('orders')
            .select('*, drivers(users(full_name, phone_number))')
            .eq('customer_id', userData.id)
            .in('status', ['pending', 'pending_driver_approval', 'driver_offered', 'accepted', 'picking_up', 'in_transit'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (activeOrder) foundActiveOrder = activeOrder;
        }
      }
    }

    if (foundActiveOrder) {
      setCurrentOrderId(foundActiveOrder.id);
      localStorage.setItem('mazar_active_order_id', foundActiveOrder.id);
      setPickup(foundActiveOrder.pickup_address);
      setDropoff(foundActiveOrder.dropoff_address);
      if (foundActiveOrder.pickup_latitude && foundActiveOrder.pickup_longitude) {
        setLocationCoords({ lat: foundActiveOrder.pickup_latitude, lng: foundActiveOrder.pickup_longitude });
      }
      setCurrentOrderType(foundActiveOrder.driver_id ? 'direct' : 'search');
      setOfferedRide(foundActiveOrder);
      
      if (['accepted', 'picking_up', 'in_transit'].includes(foundActiveOrder.status) || foundActiveOrder.payment_status === 'paid') {
        setRideStatus('active');
      } else if (foundActiveOrder.status === 'driver_offered') {
        setRideStatus('driver_offered');
      } else {
        setRideStatus('requesting');
      }
    }
  };

  useEffect(() => {
    if (!currentOrderId) return;
    
    // Listen for real-time updates on this specific order
    const subscription = supabase
      .channel(`order_${currentOrderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${currentOrderId}` },
        async (payload) => {
          const updatedOrder = payload.new;
          // When order status changes, fetch full details to get driver name and phone
          const { data } = await supabase.from('orders').select('*, drivers(users(full_name, phone_number))').eq('id', currentOrderId).limit(1).maybeSingle();
          if (data) {
            const driverName = data.drivers?.users?.full_name || 'الكابتن';
            if (data.status === 'driver_offered') {
              playNewOrderAlert();
              setRideStatus('driver_offered');
              setOfferedRide(data);
              toast.success(`🚗 قدم ${driverName} عرض سعر جديد (${data.total_amount} د.ج)!`, { duration: 8000 });
              showExternalNotification({
                title: '🚗 وصلك عرض سعر جديد لمشوارك!',
                message: `قدم الكابتن ${driverName} عرضاً بقيمة ${data.total_amount} د.ج لرحلتك. راجع العرض للموافقة.`,
                url: '/'
              });
            } else if (data.status === 'accepted') {
              playSuccessChime();
              toast.success(`🎉 تم قبول طلبك! ${driverName} في طريقه إليك`);
              showExternalNotification({
                title: 'تم قبول طلبك! السائق في طريقه إليك 🚗',
                message: `الكابتن ${driverName} في طريقه إلى موقعك الآن.`,
                url: '/'
              });
              setRideStatus('active');
              setOfferedRide(data);
            } else if (data.status === 'picking_up') {
              playNewOrderAlert();
              toast.success(`🚗 وصل السائق ${driverName} إلى موقعك وهو بانتظارك الآن!`, { duration: 8000 });
              showExternalNotification({
                title: '🚗 وصل السائق إلى موقعك!',
                message: `الكابتن ${driverName} وصل إلى نقطة الانطلاق وبانتظارك الآن.`,
                url: '/'
              });
              setRideStatus('active');
              setOfferedRide(data);
            } else if (data.status === 'in_transit') {
              playSuccessChime();
              toast.success('🚀 بدأت الرحلة الآن، نتمنى لكم رحلة سعيدة وآمنة!');
              showExternalNotification({
                title: '🚀 بدأت الرحلة نحو الوجهة',
                message: `أنتم الآن في طريقكم إلى: ${data.dropoff_address}. نتمنى لكم رحلة آمنة!`,
                url: '/'
              });
              setRideStatus('active');
              setOfferedRide(data);
            } else if (data.status === 'pending' || data.status === 'pending_driver_approval') {
              setRideStatus('requesting');
            } else if (data.status === 'cancelled') {
              playCancelChime();
              setRideStatus('idle');
              setOfferedRide(null);
              setCurrentOrderId(null);
              localStorage.removeItem('mazar_active_order_id');
              localStorage.removeItem('mazar_pending_chargily_order_id');
              toast.error('عذراً، اعتذر السائق عن تلبية هذا المشوار أو تم الإلغاء. يرجى طلب سائق آخر.');
              showExternalNotification({
                title: 'إلغاء الرحلة ⚠️',
                message: 'تم إلغاء الرحلة، يرجى طلب سائق آخر متاح.',
                url: '/'
              });
            } else if (data.status === 'delivered') {
              playSuccessChime();
              setRideStatus('idle');
              setOfferedRide(null);
              setCurrentOrderId(null);
              localStorage.removeItem('mazar_active_order_id');
              localStorage.removeItem('mazar_pending_chargily_order_id');
              toast.success('✨ وصلت إلى وجهتك بسلامة الله. تم إنهاء الرحلة بنجاح!');
              showExternalNotification({
                title: 'وصلت إلى وجهتك بسلامة الله ✨',
                message: 'تم إنهاء الرحلة بنجاح. شكراً لاختيارك مزار! نتمنى لك عمرة مقبولة وزيارة مباركة.',
                url: '/'
              });
              fetchPastTrips();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentOrderId]);

  const handleRequestRide = async (type = 'search', predefinedData = null) => {
    let finalPickup = pickup;
    let finalDropoff = dropoff;
    let price = null;
    let targetDriverId = null;
    
    if (type !== 'search' && predefinedData) {
       finalPickup = predefinedData.pickup || pickup || 'موقعي الحالي';
       finalDropoff = predefinedData.dropoff;
       price = predefinedData.price;
       targetDriverId = predefinedData.driver_id;
    }

    if (!finalPickup || !finalDropoff) return toast.error('يرجى تحديد نقطة الانطلاق والوجهة');
    
    toast.loading('جاري إنشاء الطلب...', { id: 'order-create' });
    setCurrentOrderType(type);
    setRideStatus('requesting');
    setOfferedRide(null);

    // استخراج الإحداثيات إن كانت مدونة في العنوان أو محددة مسبقاً
    let orderCoords = locationCoords;
    if (!orderCoords && finalPickup) {
      const match = finalPickup.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (match) {
        orderCoords = { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
      }
    }

    // Get real user ID or fallback
    let customerId = null;
    if (userName) {
      const { data: userData } = await supabase.from('users').select('id').eq('full_name', userName).limit(1).maybeSingle();
      if (userData) customerId = userData.id;
    }
    if (!customerId) {
      const { data: anyUser } = await supabase.from('users').select('id').limit(1).maybeSingle();
      customerId = anyUser?.id;
    }

    // إنشاء الطلب في قاعدة البيانات أولاً دون تأخير
    const { data, error } = await supabase.from('orders').insert([{
      customer_id: customerId,
      driver_id: targetDriverId,
      pickup_address: finalPickup,
      dropoff_address: finalDropoff,
      status: targetDriverId ? 'pending_driver_approval' : 'pending',
      total_amount: price || 0,
      pickup_latitude: orderCoords?.lat || null,
      pickup_longitude: orderCoords?.lng || null,
      dropoff_latitude: dropoffCoords ? dropoffCoords[0] : null,
      dropoff_longitude: dropoffCoords ? dropoffCoords[1] : null
    }]).select();

    toast.dismiss('order-create');
    
    if (error) {
      toast.error('خطأ في إنشاء الطلب: ' + error.message);
      setRideStatus('idle');
      return;
    }
    
    if (data && data.length > 0) {
      const newOrderId = data[0].id;
      setCurrentOrderId(newOrderId);
      toast.success('تم إنشاء طلبك! نحن بانتظار عروض السائقين.');
      
      // التموقع فقط بعد إنشاء الطلب بنجاح لتحديد مكان العميل للسائقين
      getReliablePosition().then(async (freshPos) => {
        if (freshPos) {
          const freshCoords = { lat: freshPos.lat, lng: freshPos.lng };
          setLocationCoords(freshCoords);
          await supabase.from('orders').update({
            pickup_latitude: freshPos.lat,
            pickup_longitude: freshPos.lng
          }).eq('id', newOrderId);
        }
      }).catch(err => console.log('Location detection skipped:', err));

      // Trigger WhatsApp Admin Notification in background
      supabase.functions.invoke('whatsapp-notify', {
        body: {
          customer_name: userName || 'معتمر',
          pickup: finalPickup,
          dropoff: finalDropoff
        }
      }).catch(err => console.error('Failed to trigger whatsapp notify:', err));

      // Trigger OneSignal Push Notification in background
      if (targetDriverId) {
        // Dedicated request to a specific driver only
        supabase.from('drivers').select('user_id').eq('id', targetDriverId).maybeSingle().then(({ data: dUser }) => {
          sendPushNotification({
            title: '⭐ طلب مشوار مخصص موجه إليك مباشرة!',
            message: `طلب المعتمر ${userName || 'معتمر'} عرضك: من ${finalPickup} إلى ${finalDropoff} (${price || 0} د.ج)`,
            targetDriverId: targetDriverId,
            targetUserId: dUser?.user_id,
            targetUrl: '/'
          }).catch(console.error);
        });
      } else {
        // General broadcast to ALL available drivers
        sendPushNotification({
          title: '🚗 طلب توصيل جديد متاح!',
          message: `المعتمر ${userName || 'معتمر'} يطلب مشواراً: من ${finalPickup} إلى ${finalDropoff}`,
          targetRole: 'driver',
          targetUrl: '/'
        }).catch(err => console.error('Failed to trigger OneSignal push:', err));
      }

      fetchPastTrips();
    }
  };

  const acceptOffer = async () => {
    toast.loading('جاري تجهيز الدفع عبر Chargily...', { id: 'payment' });
    try {
      const chargilyKey = import.meta.env.VITE_CHARGILY_SECRET_KEY || 'test_sk_jzpV4j750VHFLA2I31c7LORxXhX4uOaVIagtoA8W';
      const isLive = chargilyKey?.startsWith('live_');
      const directChargilyUrl = isLive 
        ? 'https://pay.chargily.net/api/v2/checkouts' 
        : 'https://pay.chargily.net/test/api/v2/checkouts';

      const successRedirectUrl = `${window.location.origin}${window.location.pathname}?payment_status=success&order_id=${currentOrderId}`;
      const failureRedirectUrl = `${window.location.origin}${window.location.pathname}?payment_status=failed&order_id=${currentOrderId}`;

      let checkoutUrl = null;

      // 1. محاولة استدعاء دالة Supabase Edge Function أولاً
      try {
        const { data, error } = await supabase.functions.invoke('chargily-checkout', {
          body: {
            bookingId: currentOrderId,
            amount: offeredRide.total_amount,
            successUrl: successRedirectUrl,
            failureUrl: failureRedirectUrl,
            webhookEndpoint: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chargily-webhook`,
            customerName: userName,
            chargilySecretKey: chargilyKey
          }
        });
        if (!error && data?.checkout_url) {
          checkoutUrl = data.checkout_url;
        }
      } catch (edgeErr) {
        console.warn('Edge function invoke error, falling back to direct Chargily API:', edgeErr);
      }

      // 2. البديل المباشر المضمون عبر Chargily API
      if (!checkoutUrl) {
        const resp = await fetch(directChargilyUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${chargilyKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: Math.round(Number(offeredRide.total_amount)),
            currency: 'dzd',
            success_url: successRedirectUrl,
            failure_url: failureRedirectUrl,
            metadata: [
              { booking_id: currentOrderId }
            ]
          })
        });

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`Chargily API: ${resp.status} - ${errText}`);
        }

        const resData = await resp.json();
        checkoutUrl = resData.checkout_url;
      }

      if (checkoutUrl) {
        localStorage.setItem('mazar_active_order_id', currentOrderId);
        localStorage.setItem('mazar_pending_chargily_order_id', currentOrderId);

        await supabase.from('orders').update({
          payment_method: 'card',
          payment_status: 'pending'
        }).eq('id', currentOrderId);

        toast.dismiss('payment');
        window.location.href = checkoutUrl;
      } else {
        throw new Error('لم يتم استلام رابط الدفع من بوابة Chargily');
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast.error('حدث خطأ أثناء إعداد الدفع: ' + err.message, { id: 'payment' });
    }
  };

  const acceptOfferCash = async () => {
    toast.loading('جاري تأكيد حجز المشوار نقداً...', { id: 'cash-payment' });
    try {
      const { error } = await supabase.from('orders').update({
        status: 'accepted',
        payment_method: 'cash',
        payment_status: 'pending'
      }).eq('id', currentOrderId);

      if (error) throw error;
      localStorage.setItem('mazar_active_order_id', currentOrderId);
      setRideStatus('active');
      if (offeredRide) {
        setOfferedRide(prev => ({ ...prev, status: 'accepted', payment_method: 'cash' }));
        // Notify the driver that the pilgrim accepted their offer
        if (offeredRide.driver_id) {
          supabase.from('drivers').select('user_id').eq('id', offeredRide.driver_id).maybeSingle().then(({ data: dUser }) => {
            sendPushNotification({
              title: '🎉 وافق المعتمر على عرضك!',
              message: `وافق المعتمر ${userName || ''} على مشوارك بقيمة ${offeredRide.total_amount} د.ج (نقداً عند الوصول). توجه لنقطة الانطلاق!`,
              targetDriverId: offeredRide.driver_id,
              targetUserId: dUser?.user_id,
              targetRole: 'driver',
              targetUrl: '/'
            }).catch(console.error);
          });
        }
      }
      toast.success('تم تأكيد المشوار بنجاح! سيتم الدفع نقداً عند الوصول للسائق.', { id: 'cash-payment' });
    } catch (err) {
      toast.error('حدث خطأ: ' + err.message, { id: 'cash-payment' });
    }
  };

  const rejectOffer = async () => {
    const rejectedDriverId = offeredRide?.driver_id;
    const { error } = await supabase.from('orders').update({ status: 'pending', driver_id: null, total_amount: 0 }).eq('id', currentOrderId);
    if (error) {
      toast.error('خطأ: ' + error.message);
      return;
    }

    if (rejectedDriverId) {
      supabase.from('drivers').select('user_id').eq('id', rejectedDriverId).maybeSingle().then(({ data: dUser }) => {
        sendPushNotification({
          title: 'اعتذار عن قبول العرض',
          message: 'اعتذر المعتمر عن قبول عرض السعر المقترح، يمكنك تقديم عرض آخر إذا رغبت.',
          targetDriverId: rejectedDriverId,
          targetUserId: dUser?.user_id,
          targetRole: 'driver',
          targetUrl: '/'
        }).catch(console.error);
      });
    }

    setRideStatus('requesting');
    setOfferedRide(null);
    toast.error('تم رفض العرض، ننتظر عرضاً من سائق آخر...');
  };

  const cancelRequest = async () => {
    if (!currentOrderId) return;
    const targetDriverId = offeredRide?.driver_id;
    // Set to cancelled so drivers know it's no longer available
    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', currentOrderId);
    if (error) {
      toast.error('خطأ: ' + error.message);
      return;
    }

    if (targetDriverId) {
      supabase.from('drivers').select('user_id').eq('id', targetDriverId).maybeSingle().then(({ data: dUser }) => {
        sendPushNotification({
          title: '⚠️ قام المعتمر بإلغاء المشوار',
          message: `قام المعتمر ${userName || ''} بإلغاء طلب المشوار. يمكنك استقبال طلبات أخرى.`,
          targetDriverId: targetDriverId,
          targetUserId: dUser?.user_id,
          targetRole: 'driver',
          targetUrl: '/'
        }).catch(console.error);
      });
    }

    setRideStatus('idle');
    setOfferedRide(null);
    setCurrentOrderId(null);
    localStorage.removeItem('mazar_active_order_id');
    localStorage.removeItem('mazar_pending_chargily_order_id');
    toast.success('تم إلغاء الطلب بنجاح.');
  };

  const handleGetLocation = async () => {
    toast.loading('جاري تحديد موقعك...', { id: 'loc' });
    try {
      const pos = await getReliablePosition();
      if (pos) {
        setLocationCoords({ lat: pos.lat, lng: pos.lng });
        setPickup(`موقعي الحالي (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`);
        toast.success('تم تحديد موقعك بنجاح!', { id: 'loc' });
      } else {
        toast.error('لم نتمكن من تحديد موقعك، يرجى تفعيل الـ GPS', { id: 'loc' });
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء تحديد الموقع', { id: 'loc' });
    }
  };


  // Track driver live GPS when ride is active
  useEffect(() => {
    if (!offeredRide?.driver_id || rideStatus !== 'active') {
      setDriverLiveCoords(null);
      return;
    }

    const fetchDriverCoords = async () => {
      const { data } = await supabase
        .from('drivers')
        .select('current_latitude, current_longitude')
        .eq('id', offeredRide.driver_id)
        .maybeSingle();

      if (data?.current_latitude && data?.current_longitude) {
        setDriverLiveCoords([data.current_latitude, data.current_longitude]);
      }
    };
    fetchDriverCoords();

    const channel = supabase
      .channel(`driver-gps-${offeredRide.driver_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers',
          filter: `id=eq.${offeredRide.driver_id}`
        },
        (payload) => {
          if (payload.new?.current_latitude && payload.new?.current_longitude) {
            setDriverLiveCoords([payload.new.current_latitude, payload.new.current_longitude]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [offeredRide?.driver_id, rideStatus]);

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
          <button 
            type="button"
            onClick={() => setActiveTab('book')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition text-right ${
              activeTab === 'book' 
                ? 'bg-orange-50 text-orange-600 shadow-2xs' 
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Home size={20} /> حجز رحلة
          </button>
          <button 
            type="button"
            onClick={() => { setActiveTab('history'); fetchPastTrips(); }}
            className={`w-full flex items-center justify-between p-3 rounded-xl font-bold transition text-right ${
              activeTab === 'history' 
                ? 'bg-orange-50 text-orange-600 shadow-2xs' 
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock size={20} /> رحلاتي السابقة
            </div>
            {pastTrips.length > 0 && (
              <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full font-bold">
                {pastTrips.length}
              </span>
            )}
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('payment')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition text-right ${
              activeTab === 'payment' 
                ? 'bg-orange-50 text-orange-600 shadow-2xs' 
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <CreditCard size={20} /> طرق الدفع
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition text-right ${
              activeTab === 'settings' 
                ? 'bg-orange-50 text-orange-600 shadow-2xs' 
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Settings size={20} /> الإعدادات
          </button>
        </nav>

        <div className="pt-6 border-t border-gray-100 mt-auto">
          <div 
            onClick={() => {
              setActiveTab('settings');
              setIsEditingProfile(true);
              setEditForm({
                full_name: userName || '',
                phone_number: userPhone || '',
                email: userEmail || '',
                hotel: pickup || 'فندق أبراج الكسوة'
              });
            }}
            className="flex items-center gap-3 mb-4 p-2 rounded-2xl hover:bg-orange-50/70 cursor-pointer transition group"
            title="تعديل الملف الشخصي"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 group-hover:scale-105 transition-transform shrink-0">
              <User size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-gray-800 truncate">{userName}</p>
                <Pencil size={12} className="text-gray-400 group-hover:text-orange-500 mr-1" />
              </div>
              <p className="text-xs text-gray-400 font-bold">معتمر / حاج • تعديل</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 rounded-xl font-bold transition">
            <LogOut size={20} /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 p-4 md:p-8 h-screen overflow-y-auto pb-24 md:pb-8">
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-3xl shadow-sm border border-gray-100 md:hidden">
           <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-700 to-orange-600 cursor-pointer" onClick={onGoHome}>مزار</span>
           <div className="flex items-center gap-2">
              <button onClick={handleTestBackgroundNotification} className="bg-red-50 text-red-600 p-2 rounded-xl border border-red-100 flex items-center gap-1 text-xs font-bold" title="تجربة إشعار الخلفية">
                <Bell size={16} /> فحص التنبيه
              </button>
              <button onClick={onLogout} className="text-red-500"><LogOut size={20} /></button>
            </div>
        </div>

        <div className="flex justify-between items-center hidden md:flex mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-800">
              {activeTab === 'book' && 'حجز رحلة وزيارة مزارات'}
              {activeTab === 'history' && 'سجل رحلاتي السابقة'}
              {activeTab === 'payment' && 'طرق الدفع والمعاملات'}
              {activeTab === 'settings' && 'الإعدادات والملف الشخصي'}
            </h1>
            <p className="text-xs text-gray-400 font-bold mt-0.5">
              أهلاً بك يا {userName || 'معتمرنا الكريم'} في رحاب مزار
            </p>
          </div>
          <button onClick={handleTestBackgroundNotification} className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2.5 rounded-2xl text-sm font-bold shadow-sm hover:shadow-md hover:scale-105 transition-all">
            <Bell size={18} /> تجربة إشعار الخلفية (3 ثوانٍ)
          </button>
        </div>

        {activeTab === 'book' && (
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
                  {/* Destination Database Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-gray-500 mr-1">الوجهة المقصودة (اختر من مزارات ومعالم مكة والمدينة)</label>
                    <div 
                      onClick={() => setIsSelectingDropoff(!isSelectingDropoff)} 
                      className="relative flex items-center justify-between bg-gray-50 hover:bg-orange-50/50 p-4 rounded-2xl border-2 border-gray-200 hover:border-orange-400 cursor-pointer transition shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-red-500"><MapPin size={22} /></div>
                        <div>
                          {dropoff ? (
                            <div className="flex items-center gap-2">
                              <span className="font-black text-gray-800 text-base">{dropoff}</span>
                              <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">وجهة محددة</span>
                            </div>
                          ) : (
                            <span className="font-bold text-gray-400 text-sm">اضغط لاختيار وجهتك من مزارات مكة والمدينة...</span>
                          )}
                        </div>
                      </div>
                      <ChevronDown size={20} className={`text-gray-400 transition-transform ${isSelectingDropoff ? 'rotate-180 text-orange-500' : ''}`} />
                    </div>

                    {/* Expandable Destination Picker Modal / Drawer */}
                    {isSelectingDropoff && (
                      <div className="bg-white rounded-3xl p-4 border border-orange-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        {/* City Toggle Tabs */}
                        <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl">
                          <button
                            type="button"
                            onClick={() => setDestCityTab('makkah')}
                            className={`py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition ${destCityTab === 'makkah' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                          >
                            <span>🕋</span> مكة المكرمة
                          </button>
                          <button
                            type="button"
                            onClick={() => setDestCityTab('madinah')}
                            className={`py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition ${destCityTab === 'madinah' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                          >
                            <span>🕌</span> المدينة المنورة
                          </button>
                        </div>

                        {/* Search Input Filter */}
                        <div className="relative">
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon size={18} /></div>
                          <input
                            type="text"
                            value={destSearchQuery}
                            onChange={(e) => setDestSearchQuery(e.target.value)}
                            placeholder="ابحث عن اسم المعلم، المسجد، الفندق أو المحطة..."
                            className="w-full bg-gray-50 rounded-xl py-2.5 pr-10 pl-3 border border-gray-200 focus:border-orange-500 outline-none text-xs font-bold text-gray-800"
                          />
                        </div>

                        {/* Category Filter Chips */}
                        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                          {[
                            { id: 'all', label: 'الكل' },
                            { id: 'mosque', label: 'المساجد' },
                            { id: 'historical', label: 'المزارات التاريخية' },
                            { id: 'holy_sites', label: 'المشاعر' },
                            { id: 'station', label: 'المحطات والمطارات' },
                            { id: 'hotel', label: 'الفنادق' }
                          ].map(cat => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setDestCategory(cat.id)}
                              className={`whitespace-nowrap px-3 py-1 rounded-lg font-bold transition ${destCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>

                        {/* Places List */}
                        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-50">
                          {DESTINATIONS_DB
                            .filter(place => place.city === destCityTab)
                            .filter(place => destCategory === 'all' || place.category === destCategory)
                            .filter(place => !destSearchQuery || place.name.includes(destSearchQuery) || place.categoryName.includes(destSearchQuery))
                            .map(place => (
                              <div
                                key={place.id}
                                onClick={() => {
                                  setDropoff(place.name);
                                  setDropoffCoords([place.lat, place.lng]);
                                  setIsSelectingDropoff(false);
                                  toast.success(`تم تحديد الوجهة: ${place.name} 📍`);
                                }}
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${dropoff === place.name ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'}`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="text-xl">{place.icon}</span>
                                  <div>
                                    <p className="font-black text-xs text-gray-800">{place.name}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">{place.categoryName}</p>
                                  </div>
                                </div>
                                {dropoff === place.name && (
                                  <div className="text-orange-500"><Check size={18} /></div>
                                )}
                              </div>
                            ))}
                        </div>

                        {/* Custom Input Option */}
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-[11px] font-bold text-gray-400 mb-1.5">أو اكتب وجهة مخصصة يدويًا:</p>
                          <input
                            type="text"
                            value={dropoff}
                            onChange={(e) => {
                              setDropoff(e.target.value);
                              setDropoffCoords(null);
                            }}
                            placeholder="مثال: فندق دار الإيمان جراند..."
                            className="w-full bg-gray-50 rounded-xl py-2 px-3 border border-gray-200 text-xs font-bold text-gray-700 outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleRequestRide('search')} className="w-full bg-gradient-to-r from-red-600 to-orange-500 text-white font-black text-lg py-4 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all mt-4 flex items-center justify-center gap-2">
                    <SearchIcon size={24} /> إنشاء الطلب والبحث عن سائق
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
                  <p className="font-black text-xl animate-pulse text-center mb-6">
                    {currentOrderType !== 'search' ? 'جاري الاتصال بالسائق...' : 'جاري البحث عن أفضل سائق لك...'}
                  </p>
                  <button onClick={cancelRequest} className="px-8 py-3 bg-red-50 text-red-500 border border-red-100 font-bold rounded-xl hover:bg-red-100 transition shadow-sm">
                    إلغاء الطلب
                  </button>
                </div>
              )}

              {rideStatus === 'driver_offered' && offeredRide && offeredRide.payment_status !== 'paid' && offeredRide.status !== 'accepted' && (
                <div className="bg-orange-50 p-8 rounded-3xl border border-orange-200 ring-4 ring-orange-50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-500"></div>
                  <h3 className="font-black text-xl mb-6 text-gray-800">
                    تم العثور على سائق!
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-6 items-center bg-white p-6 rounded-2xl shadow-sm mb-6">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center shadow-inner">
                      <User className="text-gray-400" size={40} />
                    </div>
                    <div className="flex-1 text-center sm:text-right">
                      <h3 className="font-black text-2xl text-gray-800 mb-1">السائق {offeredRide.drivers?.users?.full_name}</h3>
                      <p className="text-gray-500 font-bold mb-2">يعرض عليك توصيلك مقابل:</p>
                      <div className="text-3xl font-black text-red-600">{offeredRide.total_amount} د.ج</div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={acceptOffer} className="flex-1 bg-gradient-to-r from-red-600 to-orange-500 text-white font-black py-4 px-3 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition flex items-center justify-center gap-2">
                      <CreditCard size={18} /> دفع بالبطاقة (Chargily)
                    </button>
                    <button onClick={acceptOfferCash} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black py-4 px-3 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition flex items-center justify-center gap-2">
                      <Wallet size={18} /> دفع نقداً عند الوصول
                    </button>
                    <button onClick={rejectOffer} className="bg-white border-2 border-red-200 text-red-500 font-bold py-4 px-6 rounded-2xl hover:bg-red-50 transition">
                      رفض العرض
                    </button>
                  </div>
                </div>
              )}

              {rideStatus === 'active' && (
                <div className="bg-orange-50 p-8 rounded-3xl border border-orange-200 ring-4 ring-orange-50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-500"></div>
                  <h3 className="font-black text-xl mb-4 text-gray-800 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                    {offeredRide?.status === 'picking_up' ? 'الكابتن وصل إلى موقعك وهو بانتظارك 🚗' :
                     offeredRide?.status === 'in_transit' ? 'الرحلة جارية نحو وجهتك 🚀' :
                     'السائق قبل طلبك وفي طريقه إليك'}
                  </h3>

                  {/* Payment Status Alert Banner */}
                  {(offeredRide?.payment_method === 'card' || offeredRide?.payment_status === 'paid') ? (
                    <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 mb-6 shadow-sm flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                          <Check size={22} />
                        </div>
                        <div>
                          <p className="font-black text-emerald-900 text-base">تم الدفع إلكترونياً بنجاح عبر Chargily 💳</p>
                          <p className="text-emerald-700 text-xs font-bold mt-0.5">المبلغ مدفوع بالكامل بالبطاقة الذهبية / CIB - لا يُطلب منك دفع أي مبلغ نقدي للسائق عند الوصول.</p>
                        </div>
                      </div>
                      <span className="bg-emerald-600 text-white text-xs font-black px-3 py-1.5 rounded-full shrink-0 shadow-sm">
                        مدفوع بالكامل
                      </span>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 mb-6 shadow-sm flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                          <Wallet size={22} />
                        </div>
                        <div>
                          <p className="font-black text-amber-900 text-base">طريقة الدفع: نقداً عند الوصول 💵</p>
                          <p className="text-amber-700 text-xs font-bold mt-0.5">يرجى تسليم المبلغ ({offeredRide?.total_amount} د.ج) نقداً للسائق عند وصولك إلى الوجهة.</p>
                        </div>
                      </div>
                      <span className="bg-amber-600 text-white text-xs font-black px-3 py-1.5 rounded-full shrink-0 shadow-sm">
                        دفع كاش
                      </span>
                    </div>
                  )}

                  {/* Interactive Live Route Map */}
                  <RideMap 
                    pickupAddress={pickup} 
                    dropoffAddress={dropoff} 
                    pickupCoords={locationCoords ? [locationCoords.lat, locationCoords.lng] : null}
                    dropoffCoords={dropoffCoords}
                    driverCoords={driverLiveCoords}
                    height="360px"
                    className="mb-6"
                  />

                  <div className="flex flex-col sm:flex-row gap-6 items-center bg-white p-6 rounded-2xl shadow-sm mb-6">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center shadow-inner">
                      <User className="text-gray-400" size={40} />
                    </div>
                    <div className="flex-1 text-center sm:text-right">
                      <h3 className="font-black text-2xl text-gray-800 mb-1">السائق {offeredRide?.drivers?.users?.full_name || 'سائق مزار'}</h3>
                      <div className="text-sm font-bold text-gray-500 flex items-center justify-center sm:justify-start gap-2 mt-1">
                        <Wallet size={16} className="text-orange-500" />
                        <span>{(offeredRide?.payment_method === 'card' || offeredRide?.payment_status === 'paid') ? 'الدفع: إلكتروني مكتمل ومؤكد' : 'الدفع: نقداً عند الوصول'}</span>
                      </div>
                    </div>
                    <div className="text-2xl font-black text-orange-600">
                      {offeredRide?.total_amount} د.ج
                    </div>
                  </div>

                  {/* WhatsApp direct contact with Driver */}
                  {offeredRide?.drivers?.users?.phone_number && (
                    <a 
                      href={`https://wa.me/${offeredRide.drivers.users.phone_number.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="w-full bg-[#25D366] text-white font-bold py-4 rounded-2xl hover:bg-[#1da851] transition shadow-md flex items-center justify-center gap-2 mb-4"
                    >
                      <span>تواصل عبر واتساب مع السائق</span>
                    </a>
                  )}

                  <button onClick={cancelRequest} className="w-full bg-red-100 text-red-600 font-black py-4 rounded-2xl hover:bg-red-200 transition">
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
                          handleRequestRide('offer', { pickup: 'موقعي الحالي', dropoff: offer.title, price: offer.price_dzd, driver_id: offer.driver_id });
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
                    handleRequestRide('package', { pickup: pickup || 'موقعي الحالي', dropoff: selectedPackage.title, price: selectedPackage.totalPrice, driver_id: selectedPackage.driver_id });
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-gray-800 flex items-center gap-2 text-lg">
                  <Clock size={22} className="text-orange-500" />
                  رحلاتي السابقة
                </h3>
                {pastTrips.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => { setActiveTab('history'); fetchPastTrips(); }}
                    className="text-xs text-orange-600 font-bold hover:underline"
                  >
                    عرض الكل ({pastTrips.length})
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {pastTrips.length === 0 ? (
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center text-gray-500 font-bold text-sm">
                    لا توجد رحلات سابقة
                  </div>
                ) : (
                  pastTrips.slice(0, 2).map((trip) => (
                    <div 
                      key={trip.id} 
                      onClick={() => { setActiveTab('history'); fetchPastTrips(); }}
                      className="bg-gray-50 hover:bg-orange-50/60 transition p-3.5 rounded-2xl border border-gray-100 cursor-pointer space-y-1.5"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-500">
                          {trip.created_at ? new Date(trip.created_at).toLocaleDateString('ar-DZ') : ''}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                          trip.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          trip.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {trip.status === 'delivered' ? 'مكتملة' : trip.status === 'cancelled' ? 'ملغية' : 'قيد التنفيذ'}
                        </span>
                      </div>
                      <p className="font-black text-gray-800 text-sm truncate">{trip.dropoff_address}</p>
                      <div className="flex justify-between items-center text-xs font-bold text-gray-600">
                        <span className="truncate max-w-[140px]">من: {trip.pickup_address}</span>
                        <span className="text-orange-600 font-black">{trip.total_amount} د.ج</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div 
              onClick={() => setActiveTab('payment')}
              className="bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <CreditCard size={120} className="-mr-4 -mb-4" />
              </div>
              <div className="flex items-center justify-between mb-2 relative z-10">
                <h3 className="font-black text-lg">طرق الدفع المتوفرة</h3>
                <span className="text-xs bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full font-bold">إدارة</span>
              </div>
              <p className="text-orange-100 font-bold text-sm mb-4 relative z-10">مدعوم بواسطة Chargily Pay (الذهبية / CIB)</p>
              <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between relative z-10 border border-white/20">
                <span className="font-mono tracking-widest font-bold">بطاقتك الذهبية جاهزة</span>
                <CheckCircle2 size={24} />
              </div>
            </div>
          </div>

        </div>
        )}

        {/* View: Past Trips */}
        {activeTab === 'history' && (
          <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-black text-gray-800 mb-1 flex items-center gap-2">
                  <Clock className="text-orange-500" size={28} />
                  رحلاتي السابقة
                </h2>
                <p className="text-gray-500 text-sm font-bold">
                  سجل كامل بجميع مشاويرك وزياراتك للمزارات الشريفة
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={fetchPastTrips} 
                  disabled={isLoadingTrips}
                  className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold px-4 py-2.5 rounded-2xl text-sm transition border border-gray-200"
                >
                  <RefreshCw size={16} className={isLoadingTrips ? 'animate-spin text-orange-500' : ''} />
                  تحديث
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('book')}
                  className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold px-5 py-2.5 rounded-2xl text-sm shadow-md hover:shadow-lg transition"
                >
                  <Home size={18} />
                  حجز رحلة جديدة
                </button>
              </div>
            </div>

            {isLoadingTrips ? (
              <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-gray-100 space-y-4">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="font-bold text-gray-500">جاري تحميل سجل رحلاتك...</p>
              </div>
            ) : pastTrips.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-gray-100 border-dashed space-y-5">
                <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Car size={40} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-gray-800">لا توجد رحلات سابقة حتى الآن</h3>
                  <p className="text-gray-500 text-sm max-w-md mx-auto">
                    ابدأ الآن بحجز رحلتك لزيارة الحرمين الشريفين أو معالم ومزارات مكة المكرمة والمدينة المنورة.
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setActiveTab('book')}
                  className="bg-gradient-to-r from-red-600 to-orange-500 text-white font-black px-8 py-3.5 rounded-2xl shadow-md hover:shadow-lg transition inline-flex items-center gap-2"
                >
                  <Home size={20} /> احجز رحلتك الأولى الآن
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {pastTrips.map((trip) => {
                  const tripDate = trip.created_at 
                    ? new Date(trip.created_at).toLocaleDateString('ar-DZ', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'تاريخ غير محدد';
                  
                  const isDelivered = trip.status === 'delivered';
                  const isCancelled = trip.status === 'cancelled';
                  const isPending = ['pending', 'pending_driver_approval', 'driver_offered'].includes(trip.status);

                  return (
                    <div 
                      key={trip.id} 
                      className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition space-y-4"
                    >
                      <div className="flex justify-between items-start flex-wrap gap-2 border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-2xl ${
                            isDelivered ? 'bg-green-50 text-green-600' :
                            isCancelled ? 'bg-red-50 text-red-500' :
                            'bg-orange-50 text-orange-600'
                          }`}>
                            <Car size={24} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-gray-400 block">{tripDate}</span>
                            <span className="text-xs font-mono text-gray-400">معرف الطلب: #{trip.id?.slice(0, 8)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-black ${
                            isDelivered ? 'bg-green-100 text-green-700' :
                            isCancelled ? 'bg-red-100 text-red-700' :
                            isPending ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {isDelivered ? 'مكتملة بنجاح' :
                             isCancelled ? 'ملغية' :
                             isPending ? 'قيد الانتظار' : 'جارية الآن'}
                          </span>

                          <span className="bg-orange-50 text-orange-700 font-black px-3 py-1 rounded-full text-xs">
                            {trip.payment_method === 'card' ? 'دفع إلكتروني (Chargily)' : 'دفع نقدي'}
                          </span>
                        </div>
                      </div>

                      {/* Path Details */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-3 bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
                          <div className="flex items-start gap-3">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
                            <div>
                              <span className="text-[11px] font-bold text-gray-400 block">نقطة الانطلاق (Pickup)</span>
                              <span className="text-sm font-black text-gray-800">{trip.pickup_address}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <MapPin size={16} className="text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[11px] font-bold text-gray-400 block">وجهة الوصول (Destination)</span>
                              <span className="text-sm font-black text-gray-800">{trip.dropoff_address}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 bg-gray-50/70 p-4 rounded-2xl border border-gray-100 flex flex-col justify-between">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500">السائق المخصص:</span>
                            <span className="text-sm font-black text-gray-800">
                              {trip.drivers?.users?.full_name || 'سائق معتمد من مزار'}
                            </span>
                          </div>

                          <div className="flex justify-between items-center border-t border-gray-200/50 pt-2">
                            <span className="text-xs font-bold text-gray-500">القيمة الإجمالية:</span>
                            <div className="text-left">
                              <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">
                                {trip.total_amount} د.ج
                              </span>
                              {trip.total_amount > 0 && (
                                <span className="text-[11px] text-gray-400 font-bold block">
                                  ≈ {(trip.total_amount * 0.028).toFixed(2)} ريال سعودي
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 flex gap-2">
                            <button 
                              type="button"
                              onClick={() => {
                                setPickup(trip.pickup_address);
                                setDropoff(trip.dropoff_address);
                                setActiveTab('book');
                                toast.success('تم ملء تفاصيل الرحلة، يمكنك الآن إتمام الحجز!');
                              }}
                              className="w-full bg-white hover:bg-orange-50 text-orange-600 border border-orange-200 font-bold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <RefreshCw size={14} /> إعادة طلب هذه الرحلة
                            </button>
                            {trip.drivers?.users?.phone_number && (
                              <a 
                                href={`https://wa.me/${trip.drivers.users.phone_number.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-[#25D366] hover:bg-[#1eb855] text-white p-2 rounded-xl transition flex items-center justify-center shrink-0"
                                title="مراسلة السائق على واتساب"
                              >
                                <MessageCircle size={16} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* View: Payment Methods */}
        {activeTab === 'payment' && (
          <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-black text-gray-800 mb-1 flex items-center gap-2">
                <CreditCard className="text-orange-500" size={28} />
                طرق الدفع والبطاقات
              </h2>
              <p className="text-gray-500 text-sm font-bold">
                خيارات دفع آمنة وسهلة بالدينار الجزائري مباشرة للمعتمرين في مكة والمدينة
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Chargily Card */}
              <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-3xl p-7 text-white shadow-xl relative overflow-hidden border border-gray-700/50 flex flex-col justify-between">
                <div className="absolute right-0 top-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xl font-black text-orange-400">Chargily Pay</span>
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 size={12} /> نشط ومفعل
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">بوابة الدفع الإلكتروني الجزائرية الرسمية</p>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/10">
                      <CreditCard size={28} className="text-orange-400" />
                    </div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 mb-6 space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-300">
                      <span>البطاقات المدعومة:</span>
                      <span className="font-bold text-white">الذهبية (بريدي موب) + بطاقات CIB</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-300">
                      <span>العملة المقتطعة:</span>
                      <span className="font-bold text-emerald-400">الدينار الجزائري (DZD)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-300">
                      <span>أمان المعاملات:</span>
                      <span className="font-bold text-white">تشفير SSL 256-bit معتمد</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 p-3 rounded-xl border border-orange-500/30 text-xs text-orange-200">
                    💡 ادفع مشاويرك وباقات المزارات فورياً من رصيدك في الجزائر دون عناء صرف العملة للريال السعودي.
                  </div>
                  <button 
                    type="button"
                    onClick={() => setActiveTab('book')}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black py-3 rounded-xl transition text-sm shadow-md"
                  >
                    احجز وادفع الآن عبر Chargily
                  </button>
                </div>
              </div>

              {/* Cash on Delivery Card */}
              <div className="bg-white rounded-3xl p-7 shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl font-black text-gray-800">الدفع نقداً عند الوصول</span>
                        <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-100">
                          <CheckCircle2 size={12} /> متاح دائماً
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">السداد المباشر للسائق بعد إتمام المشوار</p>
                    </div>
                    <div className="bg-orange-50 p-2.5 rounded-2xl text-orange-600">
                      <Wallet size={28} />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6 space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>العملات المقبولة:</span>
                      <span className="font-bold text-gray-800">الدينار الجزائري أو الريال السعودي</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>وقت الدفع:</span>
                      <span className="font-bold text-gray-800">عند وصولك لوجهتك بسلامة الله</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>الإيصال:</span>
                      <span className="font-bold text-gray-800">تأكيد فوري داخل التطبيق</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    يمكنك اختيار الدفع نقداً عند تأكيد أي رحلة أو باقة مزارات، ويتم تحصيل المبلغ المتفق عليه مباشرة دون أي رسوم إضافية.
                  </p>
                </div>

                <div className="mt-6">
                  <button 
                    type="button"
                    onClick={() => setActiveTab('book')}
                    className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl transition text-sm shadow-sm"
                  >
                    طلب رحلة بدفع نقدي
                  </button>
                </div>
              </div>
            </div>

            {/* Transactions Section */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
                <Clock size={20} className="text-orange-500" />
                سجل المدفوعات والمعاملات الأخيرة
              </h3>
              {pastTrips.filter(t => t.payment_status === 'paid' || t.payment_method).length === 0 ? (
                <div className="bg-gray-50 p-8 rounded-2xl text-center text-gray-400 font-bold text-sm">
                  لا توجد معاملات مدفوعة بعد
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {pastTrips.filter(t => t.payment_status === 'paid' || t.payment_method).map((trip) => (
                    <div key={trip.id} className="py-3.5 flex justify-between items-center flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                          {trip.payment_method === 'card' ? <CreditCard size={20} /> : <Wallet size={20} />}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-800">
                            مشوار: {trip.dropoff_address}
                          </p>
                          <p className="text-xs text-gray-400">
                            {trip.payment_method === 'card' ? 'بطاقة Chargily' : 'نقداً'} • {trip.created_at ? new Date(trip.created_at).toLocaleDateString('ar-DZ') : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="font-black text-gray-800 text-sm block">{trip.total_amount} د.ج</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trip.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {trip.payment_status === 'paid' ? 'مدفوع' : 'معلق'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* View: Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-4xl mx-auto pb-10">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-black text-gray-800 mb-1 flex items-center gap-2">
                <Settings className="text-orange-500" size={28} />
                الإعدادات والملف الشخصي
              </h2>
              <p className="text-gray-500 text-sm font-bold">
                إدارة تفضيلات حسابك، الإشعارات، والخصوصية
              </p>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-5">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
                  <User size={20} className="text-orange-500" /> الملف الشخصي وبيانات المعتمر
                </h3>
                {!isEditingProfile && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditForm({
                        full_name: userName || '',
                        phone_number: userPhone || '',
                        email: userEmail || '',
                        hotel: pickup || 'فندق أبراج الكسوة'
                      });
                      setIsEditingProfile(true);
                    }}
                    className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold px-4 py-2 rounded-xl text-xs transition border border-orange-200"
                  >
                    <Pencil size={14} /> تعديل البيانات
                  </button>
                )}
              </div>

              {!isEditingProfile ? (
                /* View Mode */
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                      {userName ? userName[0].toUpperCase() : 'م'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-gray-900 text-lg">{userName || 'معتمر كريم'}</h4>
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">حساب نشط</span>
                      </div>
                      <p className="text-xs font-bold text-gray-500 mt-0.5">معتمر / زائر في المشاعر المقدسة</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                      <span className="text-[11px] font-bold text-gray-400 block mb-1 flex items-center gap-1">
                        <Phone size={12} className="text-orange-500" /> رقم الهاتف / واتساب
                      </span>
                      <span className="text-sm font-black text-gray-800" dir="ltr">
                        {userPhone || 'لم يُحدد بعد'}
                      </span>
                    </div>

                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                      <span className="text-[11px] font-bold text-gray-400 block mb-1 flex items-center gap-1">
                        <Mail size={12} className="text-orange-500" /> البريد الإلكتروني
                      </span>
                      <span className="text-sm font-black text-gray-800 truncate block">
                        {userEmail || 'اختياري'}
                      </span>
                    </div>

                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                      <span className="text-[11px] font-bold text-gray-400 block mb-1 flex items-center gap-1">
                        <Building size={12} className="text-orange-500" /> الفندق المعتاد للانطلاق
                      </span>
                      <span className="text-sm font-black text-gray-800 truncate block">
                        {pickup || 'فندق أبراج الكسوة'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit Mode */
                <form onSubmit={handleSaveProfile} className="space-y-4 bg-orange-50/40 p-5 rounded-2xl border border-orange-100">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        الاسم الكامل للمعتمر <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          required
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-orange-500 transition"
                          placeholder="مثال: محمد عبد الله"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        رقم الهاتف / واتساب للتواصل <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          required
                          dir="ltr"
                          value={editForm.phone_number}
                          onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-orange-500 transition text-right"
                          placeholder="مثال: +213697953761 أو 05..."
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1 font-bold">ضروري ليتواصل معك السائق فور قبول مشوارك</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        البريد الإلكتروني (اختياري)
                      </label>
                      <div className="relative">
                        <Mail size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-orange-500 transition"
                          placeholder="example@mail.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        فندق الإقامة الافتراضي في مكة / المدينة
                      </label>
                      <div className="relative">
                        <Building size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={editForm.hotel}
                          onChange={(e) => setEditForm({ ...editForm, hotel: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-orange-500 transition"
                          placeholder="مثال: فندق أبراج الكسوة"
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1 font-bold">سيظهر كنقطة انطلاق افتراضية عند طلب المشاوير</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-orange-100">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-black px-6 py-2.5 rounded-xl text-sm transition shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save size={16} />
                      {isSavingProfile ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="bg-white hover:bg-gray-100 text-gray-600 font-bold px-4 py-2.5 rounded-xl text-sm transition border border-gray-200 flex items-center gap-1.5"
                    >
                      <X size={16} /> إلغاء
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Notifications & GPS Privacy Settings */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
                <Bell size={20} className="text-orange-500" /> التنبيهات والخصوصية
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div>
                    <span className="font-bold text-sm text-gray-800 block">إشعارات المتصفح الفورية (Push)</span>
                    <span className="text-xs text-gray-500">تلقي عروض السائقين وتأكيد الحجوزات فوراً</span>
                  </div>
                  <button 
                    type="button"
                    onClick={handleTestBackgroundNotification}
                    className="bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold px-4 py-2 rounded-xl text-xs transition border border-orange-200"
                  >
                    فحص الإشعارات
                  </button>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50/70 rounded-2xl border border-blue-100 text-blue-900 text-xs">
                  <ShieldCheck size={20} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-1">خصوصية التموقع (GPS):</span>
                    <span>لحماية خصوصيتك وتوفير شحن البطارية، منصة مزار لا تطلب ولا تفعّل التموقع عند فتح الموقع، وإنما تكتشف موقعك بدقة فقط بعد إتمام إنشاء طلبك لتوجيه السائقين إليك.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Support and Contact */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
                <MessageCircle size={20} className="text-orange-500" /> خدمة العملاء والدعم
              </h3>
              <p className="text-sm text-gray-500 font-bold">فريق مزار متواجد لخدمتكم والإجابة على أي استفسار حول مشاويركم وباقاتكم.</p>
              
              <div className="flex gap-3 flex-wrap">
                <a 
                  href="https://wa.me/213697953761" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex-1 bg-[#25D366] hover:bg-[#1da851] text-white font-bold py-3.5 px-6 rounded-2xl transition shadow-md flex items-center justify-center gap-2 text-sm min-w-[200px]"
                >
                  <MessageCircle size={18} />
                  <span>محادثة واتساب مباشرة مع الدعم</span>
                </a>
              </div>
            </div>

            {/* Sign Out Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h4 className="font-black text-gray-800">تسجيل الخروج من الحساب</h4>
                <p className="text-xs text-gray-400 font-bold">يمكنك العودة في أي وقت بإدخال اسمك</p>
              </div>
              <button 
                type="button"
                onClick={onLogout}
                className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-6 py-3 rounded-2xl transition flex items-center gap-2 text-sm border border-red-100"
              >
                <LogOut size={18} /> تسجيل الخروج
              </button>
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around p-2.5 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          <button 
            type="button"
            onClick={() => setActiveTab('book')} 
            className={`flex-1 py-1 flex flex-col items-center gap-1 rounded-xl transition ${activeTab === 'book' ? 'text-orange-600 font-black' : 'text-gray-400 font-bold'}`}
          >
            <Home size={22} />
            <span className="text-[11px]">حجز رحلة</span>
          </button>
          <button 
            type="button"
            onClick={() => { setActiveTab('history'); fetchPastTrips(); }} 
            className={`flex-1 py-1 flex flex-col items-center gap-1 rounded-xl transition relative ${activeTab === 'history' ? 'text-orange-600 font-black' : 'text-gray-400 font-bold'}`}
          >
            <Clock size={22} />
            <span className="text-[11px]">رحلاتي</span>
            {pastTrips.length > 0 && (
              <span className="absolute top-0 right-1/4 w-2 h-2 rounded-full bg-orange-500"></span>
            )}
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('payment')} 
            className={`flex-1 py-1 flex flex-col items-center gap-1 rounded-xl transition ${activeTab === 'payment' ? 'text-orange-600 font-black' : 'text-gray-400 font-bold'}`}
          >
            <CreditCard size={22} />
            <span className="text-[11px]">طرق الدفع</span>
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('settings')} 
            className={`flex-1 py-1 flex flex-col items-center gap-1 rounded-xl transition ${activeTab === 'settings' ? 'text-orange-600 font-black' : 'text-gray-400 font-bold'}`}
          >
            <Settings size={22} />
            <span className="text-[11px]">الإعدادات</span>
          </button>
        </div>
        
        <div className="mt-12">
          <Footer />
        </div>
      </main>
    </div>
  );
}
