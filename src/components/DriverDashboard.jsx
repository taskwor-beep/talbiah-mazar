import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, DollarSign, LogOut, Check, X as CloseIcon, Car, Home, List as ListIcon, Wallet, Plus, Trash2, AlertCircle, Volume2, User, Phone, ShieldCheck, Key, RefreshCw, Send, CheckCircle2, Clock, ArrowDownLeft, ArrowUpRight, Percent, Award, Sparkles, CreditCard, ChevronRight, FileText, CheckCircle, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import Footer from './Footer';
import RideMap from './RideMap';
import { playNewOrderAlert, playSuccessChime, playUrgentAlert, playCancelChime } from '../lib/sound';
import { setOneSignalRole, requestNotificationPermission, showExternalNotification, sendPushNotification } from '../lib/onesignal';
import { getReliablePosition } from '../lib/geo';

export default function DriverDashboard({ userName, userId: propUserId, onLogout, onGoHome }) {
  const [isOnline, setIsOnline] = useState(true);
  
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ earnings: 0, completedRides: 0, rating: 5.0 });
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'offers' | 'wallet' | 'profile'
  
  const [offers, setOffers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [driverId, setDriverId] = useState(null);
  const [driverStatus, setDriverStatus] = useState('approved');
  const [pricePrompt, setPricePrompt] = useState(null);
  const [newOfferPrice, setNewOfferPrice] = useState('');
  const [rejectedOrders, setRejectedOrders] = useState([]);

  // Driver Profile & Edit State
  const [driverProfile, setDriverProfile] = useState({
    userId: null,
    driverId: null,
    full_name: userName || '',
    phone_number: '',
    vehicle_type: 'سيارة سيدان',
    license_plate: '',
    rating: 5.0,
    total_deliveries: 0,
    status: 'approved'
  });
  const [profileForm, setProfileForm] = useState({
    full_name: userName || '',
    phone_number: '',
    vehicle_type: 'سيارة سيدان',
    license_plate: '',
    new_password: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Driver Wallet & Platform Commission State
  const [walletOrders, setWalletOrders] = useState([]);
  const [commissionRate, setCommissionRate] = useState(10);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementForm, setSettlementForm] = useState({ ccp_number: '', notes: '' });
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);
  
  // New Offer State
  const [newOffer, setNewOffer] = useState({ title: '', priceDZD: '', details: '' });
  
  // New Package State (Dynamic steps)
  const [newPackage, setNewPackage] = useState({ 
    title: '', 
    discountDZD: '',
    steps: [{ title: '', startTime: '', endTime: '', priceDZD: '' }] 
  });

  const [activeRide, setActiveRide] = useState(null);
  const [myDriverCoords, setMyDriverCoords] = useState(null);
  const activeRideRef = React.useRef(null);


  // Track driver live GPS only when there is an active ride
  useEffect(() => {
    if (!navigator.geolocation || !activeRide) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setMyDriverCoords(coords);

        if (driverId) {
          supabase.from('drivers').update({
            current_latitude: coords[0],
            current_longitude: coords[1],
            is_online: true
          }).eq('id', driverId).then(() => {});
        }
      },
      (err) => {
        console.warn('Driver GPS watch error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [driverId, activeRide]);

  useEffect(() => {
    const currentUserId = propUserId || localStorage.getItem('userId');
    setOneSignalRole('driver', userName, currentUserId, driverId);
    requestNotificationPermission();
    fetchDriverData();
    // Do not call handleRefreshDriverGps() on initial mount to respect user request
  }, [userName, propUserId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.NativeBridge) {
      if (isOnline) {
        window.NativeBridge.startBackgroundService?.();
      } else {
        window.NativeBridge.stopBackgroundService?.();
      }
    }
  }, [isOnline]);

  const fetchDriverData = async () => {
    // Get driver by user name, or just first driver
    const { data: userData } = await supabase.from('users').select('*').eq('full_name', userName).limit(1).maybeSingle();
    let currentDriverId = null;
    let currentDriverRating = 5.0;
    const currentUserId = userData?.id || propUserId || localStorage.getItem('userId');
    
    if (userData) {
      const { data: driverInfo } = await supabase.from('drivers').select('*').eq('user_id', userData.id).limit(1).maybeSingle();
      if (driverInfo) {
        currentDriverId = driverInfo.id;
        setDriverStatus(driverInfo.status || 'approved');
        if (driverInfo.rating) currentDriverRating = driverInfo.rating;

        const profileData = {
          userId: userData.id,
          driverId: driverInfo.id,
          full_name: userData.full_name || userName,
          phone_number: userData.phone_number || '',
          vehicle_type: driverInfo.vehicle_type || 'سيارة سيدان',
          license_plate: driverInfo.license_plate || '',
          rating: driverInfo.rating || 5.0,
          total_deliveries: driverInfo.total_deliveries || 0,
          status: driverInfo.status || 'approved'
        };
        setDriverProfile(profileData);
        setProfileForm({
          full_name: userData.full_name || userName,
          phone_number: userData.phone_number || '',
          vehicle_type: driverInfo.vehicle_type || 'سيارة سيدان',
          license_plate: driverInfo.license_plate || '',
          new_password: ''
        });
      }
    }
    
    // Fallback if not found
    if (!currentDriverId) {
      const { data: firstDriver } = await supabase.from('drivers').select('*, users(*)').limit(1).maybeSingle();
      if (firstDriver) {
        currentDriverId = firstDriver.id;
        if (firstDriver.status) setDriverStatus(firstDriver.status);
        if (firstDriver.rating) currentDriverRating = firstDriver.rating;

        const fallbackUser = firstDriver.users;
        const profileData = {
          userId: fallbackUser?.id || null,
          driverId: firstDriver.id,
          full_name: fallbackUser?.full_name || userName,
          phone_number: fallbackUser?.phone_number || '',
          vehicle_type: firstDriver.vehicle_type || 'سيارة سيدان',
          license_plate: firstDriver.license_plate || '',
          rating: firstDriver.rating || 5.0,
          total_deliveries: firstDriver.total_deliveries || 0,
          status: firstDriver.status || 'approved'
        };
        setDriverProfile(profileData);
        setProfileForm({
          full_name: fallbackUser?.full_name || userName,
          phone_number: fallbackUser?.phone_number || '',
          vehicle_type: firstDriver.vehicle_type || 'سيارة سيدان',
          license_plate: firstDriver.license_plate || '',
          new_password: ''
        });
      }
    }

    // Fetch platform commission percentage from admin_settings
    try {
      const { data: commData } = await supabase.from('admin_settings').select('value').eq('key', 'platform_commission').maybeSingle();
      if (commData?.value?.percentage != null) {
        setCommissionRate(Number(commData.value.percentage));
      }
    } catch (e) {
      console.warn('Failed to load platform commission:', e);
    }

    if (currentDriverId) {
      setDriverId(currentDriverId);
      setOneSignalRole('driver', userName, currentUserId, currentDriverId);
      
      // Sync session with Android Native Foreground Background Service
      if (typeof window !== 'undefined' && window.NativeBridge) {
        if (typeof window.NativeBridge.setUserSession === 'function') {
          window.NativeBridge.setUserSession(
            'driver',
            String(currentUserId || ''),
            String(currentDriverId),
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY
          );
        }
        if (typeof window.NativeBridge.startBackgroundService === 'function') {
          window.NativeBridge.startBackgroundService();
        }
      }

      // Fetch offers
      const { data: offersData } = await supabase.from('driver_offers').select('*').eq('driver_id', currentDriverId);
      if (offersData) setOffers(offersData);
      
      // Fetch packages and steps
      const { data: packagesData } = await supabase.from('driver_packages').select('*, package_steps(*)').eq('driver_id', currentDriverId);
      if (packagesData) setPackages(packagesData);

      // Check for active ride (driver_offered, accepted, picking_up, in_transit)
      const { data: activeOrder } = await supabase.from('orders')
        .select('*, users!orders_customer_id_fkey(full_name, phone_number)')
        .eq('driver_id', currentDriverId)
        .in('status', ['driver_offered', 'accepted', 'picking_up', 'in_transit'])
        .limit(1)
        .maybeSingle();

      if (activeOrder) {
        const newActiveRide = {
          id: activeOrder.id,
          customer_id: activeOrder.customer_id,
          pickup: activeOrder.pickup_address,
          dropoff: activeOrder.dropoff_address,
          price: activeOrder.total_amount,
          status: activeOrder.status,
          lat: activeOrder.pickup_latitude,
          lng: activeOrder.pickup_longitude,
          customerName: activeOrder.users?.full_name,
          customerPhone: activeOrder.users?.phone_number,
          paymentMethod: activeOrder.payment_method || 'cash',
          paymentStatus: activeOrder.payment_status || 'pending'
        };
        setActiveRide(newActiveRide);
        activeRideRef.current = newActiveRide;
      } else {
        if (activeRideRef.current && activeRideRef.current.status === 'driver_offered') {
          const rejectedId = activeRideRef.current.id;
          setRejectedOrders(prev => [...prev, rejectedId]);
        } else if (activeRideRef.current && ['accepted', 'picking_up', 'in_transit'].includes(activeRideRef.current.status)) {
          const previousActiveId = activeRideRef.current.id;
          // Only show cancellation toast if the order status in DB is actually 'cancelled'
          supabase.from('orders').select('status').eq('id', previousActiveId).maybeSingle().then(({ data: oCheck }) => {
            if (oCheck?.status === 'cancelled') {
              toast.error('⚠️ قام المعتمر بإلغاء المشوار.');
            }
          });
        }
        setActiveRide(null);
        activeRideRef.current = null;
        
        const { data: pendingOrders } = await supabase.from('orders')
          .select('*, users!orders_customer_id_fkey(phone_number)')
          .in('status', ['pending', 'pending_driver_approval']);
        
        if (pendingOrders) {
          const validOrders = pendingOrders.filter(o => 
            (o.status === 'pending' && !o.driver_id) || // General pool
            (o.status === 'pending_driver_approval' && o.driver_id === currentDriverId) // Direct to me
          );

          setRequests(validOrders.map(o => ({
            id: o.id,
            customer_id: o.customer_id,
            pickup: o.pickup_address,
            dropoff: o.dropoff_address,
            price: o.total_amount || 'قابل للتفاوض',
            time: 'الآن',
            lat: o.pickup_latitude,
            lng: o.pickup_longitude,
            isDirect: o.status === 'pending_driver_approval',
            customerPhone: o.users?.phone_number
          })));
        } else {
          setRequests([]);
        }
      }

      // Fetch completed orders for wallet and stats
      const { data: completedOrders } = await supabase.from('orders')
        .select('*, users!orders_customer_id_fkey(full_name, phone_number)')
        .eq('driver_id', currentDriverId)
        .in('status', ['delivered', 'accepted'])
        .order('created_at', { ascending: false });

      if (completedOrders) {
        setWalletOrders(completedOrders);
        const deliveredOnly = completedOrders.filter(o => o.status === 'delivered');
        const totalEarnings = deliveredOnly.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
        setStats({
          earnings: totalEarnings,
          completedRides: deliveredOnly.length,
          rating: currentDriverRating
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
          const newOrder = payload.new;
          if (!newOrder) {
            fetchDriverData();
            return;
          }

          // 1. New Order created or updated to pending / pending_driver_approval
          if (payload.eventType === 'INSERT' || (payload.eventType === 'UPDATE' && (newOrder.status === 'pending' || newOrder.status === 'pending_driver_approval'))) {
            if (newOrder.driver_id) {
              // Dedicated / Direct offer targeted to a specific driver
              if (newOrder.driver_id === driverId) {
                window.NativeBridge?.markOrderAlerted?.(newOrder.id);
                playUrgentAlert();
                toast('⭐ طلب مشوار مخصص موجه إليك مباشرة من المعتمر!', { icon: '⭐', duration: 7000 });
                showExternalNotification({
                  title: '⭐ طلب مشوار خاص موجه إليك مباشرة!',
                  message: `طلب المعتمر عرضك: من ${newOrder.pickup_address || 'الموقع الحالي'} ⬅️ إلى ${newOrder.dropoff_address || 'الوجهة'} (${newOrder.total_amount || 0} د.ج)`,
                  url: '/'
                });
              } else {
                // Targeted to someone else -> DO NOT ALERT THIS DRIVER!
                return;
              }
            } else {
              // General broadcast request open to all available drivers
              window.NativeBridge?.markOrderAlerted?.(newOrder.id);
              playNewOrderAlert();
              toast('🔔 طلب توصيل جديد متاح بالقرب منك!', { icon: '🚗', duration: 6000 });
              showExternalNotification({
                title: '🚗 طلب توصيل جديد متاح!',
                message: `نقطة الانطلاق: ${newOrder.pickup_address || 'موقع المعتمر'} ⬅️ الوجهة: ${newOrder.dropoff_address || 'مشوار جديد'}`,
                url: '/'
              });
            }
          }
          // 2. Pilgrim accepted driver's offer or paid for trip
          else if (payload.eventType === 'UPDATE' && newOrder.status === 'accepted' && newOrder.driver_id === driverId) {
            playSuccessChime();
            const payText = newOrder.payment_method === 'card' ? 'مدفوع إلكترونياً عبر بطاقة' : 'نقداً عند الوصول';
            toast.success(`🎉 تم قبول عرضك من المعتمر! (${payText})`, { duration: 7000 });
            showExternalNotification({
              title: '🎉 تم قبول عرضك من المعتمر!',
              message: `وافق المعتمر على عرضك (${payText})، توجه الآن لنقطة الانطلاق!`,
              url: '/'
            });
          }
          // 3. Order cancelled while assigned to this driver
          else if (payload.eventType === 'UPDATE' && newOrder.status === 'cancelled') {
            if (newOrder.driver_id === driverId || activeRideRef.current?.id === newOrder.id) {
              playCancelChime();
              toast.error('⚠️ قام المعتمر بإلغاء المشوار.', { duration: 6000 });
              showExternalNotification({
                title: '⚠️ تم إلغاء المشوار',
                message: 'قام المعتمر بإلغاء طلب المشوار. يمكنك استقبال طلبات أخرى.',
                url: '/'
              });
            }
          }

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

  const acceptRide = async (ride) => {
    // إذا كان الطلب قابلاً للتفاوض أو بدون سعر مسبق، نفتح نافذة إدخال السعر أولاً ولا نطلب GPS الآن لئلا يُطلب مرتين
    if (ride.price === 'قابل للتفاوض' || !ride.price || Number(ride.price) <= 0) {
      setPricePrompt(ride);
      setNewOfferPrice('');
      return;
    }

    // الطلب محدد السعر مسبقاً (باقة أو عرض ثابت)، يتم تحديد الموقع والقبول مباشرة
    toast.loading('جاري قبول الطلب وتحديد موقعك...', { id: 'accept' });

    let driverGps = myDriverCoords;
    try {
      const fresh = await getReliablePosition();
      if (fresh) {
        driverGps = [fresh.lat, fresh.lng];
        setMyDriverCoords(driverGps);
      }
    } catch (e) {}

    // حفظ موقع السائق في قاعدة البيانات فور القبول
    if (driverId && driverGps) {
      await supabase.from('drivers').update({
        current_latitude: driverGps[0],
        current_longitude: driverGps[1],
        is_online: true
      }).eq('id', driverId);
    }

    const { error } = await supabase.from('orders').update({ 
      driver_id: driverId, 
      status: 'accepted' 
    }).eq('id', ride.id);

    if (error) {
      toast.error('خطأ من قاعدة البيانات: ' + error.message, { id: 'accept' });
    } else {
      toast.success('تم قبول الطلب وتحديد موقعك بنجاح! انطلق نحو العميل.', { id: 'accept' });
      
      // Notify customer of direct ride acceptance
      if (ride.customer_id) {
        sendPushNotification({
          title: '🎉 تم قبول طلبك! السائق في طريقه إليك 🚗',
          message: `وافق الكابتن ${userName || 'السائق'} على طلبك وهو في طريقه إلى موقعك الآن.`,
          targetUserId: ride.customer_id,
          targetUrl: '/'
        }).catch(console.error);
      }
      
      fetchDriverData();
    }
  };

  const submitPriceOffer = async (e) => {
    e.preventDefault();
    if (newOfferPrice && !isNaN(newOfferPrice) && Number(newOfferPrice) > 0) {
      toast.loading('جاري إرسال العرض وتحديد موقعك...', { id: 'offer' });

      // تحديد موقع السائق بدقة فور إرسال العرض وقبول الطلب
      let driverGps = myDriverCoords;
      try {
        const fresh = await getReliablePosition();
        if (fresh) {
          driverGps = [fresh.lat, fresh.lng];
          setMyDriverCoords(driverGps);
        }
      } catch (err) {}

      if (driverId && driverGps) {
        await supabase.from('drivers').update({
          current_latitude: driverGps[0],
          current_longitude: driverGps[1],
          is_online: true
        }).eq('id', driverId);
      }

      const { error } = await supabase.from('orders').update({ 
        driver_id: driverId, 
        status: 'driver_offered', 
        total_amount: parseFloat(newOfferPrice) 
      }).eq('id', pricePrompt.id);
      
      if (error) {
        toast.error('خطأ من قاعدة البيانات: ' + error.message, { id: 'offer' });
      } else {
        toast.success('تم إرسال عرضك وتحديد موقعك بنجاح! في انتظار موافقة المعتمر.', { id: 'offer' });
        
        // Notify customer of new price offer (with fallback if customer_id wasn't in object)
        const targetCustomerId = pricePrompt.customer_id;
        if (targetCustomerId) {
          sendPushNotification({
            title: '🚗 وصلك عرض سعر جديد لمشوارك!',
            message: `قدم الكابتن ${userName || 'السائق'} عرضاً بقيمة ${newOfferPrice} د.ج لرحلتك`,
            targetUserId: targetCustomerId,
            targetUrl: '/'
          }).catch(console.error);
        } else {
          // Fallback fetch customer_id from database
          supabase.from('orders').select('customer_id').eq('id', pricePrompt.id).maybeSingle().then(({ data: oData }) => {
            if (oData?.customer_id) {
              sendPushNotification({
                title: '🚗 وصلك عرض سعر جديد لمشوارك!',
                message: `قدم الكابتن ${userName || 'السائق'} عرضاً بقيمة ${newOfferPrice} د.ج لرحلتك`,
                targetUserId: oData.customer_id,
                targetUrl: '/'
              }).catch(console.error);
            }
          });
        }

        setPricePrompt(null);
        setNewOfferPrice('');
        fetchDriverData();
      }
    } else {
      toast.error('الرجاء إدخال سعر صحيح أكبر من الصفر.');
    }
  };

  const handleRefreshDriverGps = async () => {
    toast.loading('جاري تحديد موقعك...', { id: 'driver-gps' });
    try {
      const pos = await getReliablePosition();
      if (pos) {
        const coords = [pos.lat, pos.lng];
        setMyDriverCoords(coords);
        if (driverId) {
          await supabase.from('drivers').update({
            current_latitude: coords[0],
            current_longitude: coords[1],
            is_online: true
          }).eq('id', driverId);
        }
        toast.success('تم تحديد موقعك بنجاح وظهوره على الخريطة! 🚗', { id: 'driver-gps' });
      } else {
        toast.error('تعذر تحديد الموقع، يرجى التأكد من تشغيل الموقع في هاتفك', { id: 'driver-gps' });
      }
    } catch (e) {
      toast.error('حدث خطأ في تحديد الموقع', { id: 'driver-gps' });
    }
  };

  const rejectRideRequest = async (id, customerId = null) => {
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', id);
    fetchDriverData();
    toast.error('تم إلغاء الطلب');
    if (customerId) {
      sendPushNotification({
        title: 'تم إلغاء الطلب ⚠️',
        message: 'عذراً، اعتذر السائق عن تلبية هذا المشوار. يمكنك طلب سائق آخر متاح.',
        targetUserId: customerId,
        targetUrl: '/'
      }).catch(console.error);
    } else {
      supabase.from('orders').select('customer_id').eq('id', id).maybeSingle().then(({ data: oData }) => {
        if (oData?.customer_id) {
          sendPushNotification({
            title: 'تم إلغاء الطلب ⚠️',
            message: 'عذراً، اعتذر السائق عن تلبية هذا المشوار. يمكنك طلب سائق آخر متاح.',
            targetUserId: oData.customer_id,
            targetUrl: '/'
          }).catch(console.error);
        }
      });
    }
  };

  const notifyArrival = async () => {
    if (!activeRide) return;
    toast.loading('جاري إشعار المعتمر بوصولك...', { id: 'status-update' });
    const { error } = await supabase.from('orders').update({ status: 'picking_up' }).eq('id', activeRide.id);
    if (!error) {
      toast.success('تم إشعار المعتمر بوصولك إلى الموقع! 🚗', { id: 'status-update' });
      if (activeRide.customer_id) {
        sendPushNotification({
          title: '🚗 وصل السائق إلى موقعك!',
          message: `الكابتن ${userName || 'السائق'} وصل إلى نقطة الانطلاق وبانتظارك الآن!`,
          targetUserId: activeRide.customer_id,
          targetUrl: '/'
        }).catch(console.error);
      }
      fetchDriverData();
    } else {
      toast.error('حدث خطأ: ' + error.message, { id: 'status-update' });
    }
  };

  const startRide = async () => {
    if (!activeRide) return;
    toast.loading('جاري بدء المشوار...', { id: 'status-update' });
    const { error } = await supabase.from('orders').update({ status: 'in_transit' }).eq('id', activeRide.id);
    if (!error) {
      toast.success('بدأت الرحلة بنجاح! رافقتكم السلامة 🚀', { id: 'status-update' });
      if (activeRide.customer_id) {
        sendPushNotification({
          title: '🚀 بدأت الرحلة الآن',
          message: `أنتم الآن في طريقكم إلى: ${activeRide.dropoff}. نتمنى لكم رحلة آمنة ومريحة!`,
          targetUserId: activeRide.customer_id,
          targetUrl: '/'
        }).catch(console.error);
      }
      fetchDriverData();
    } else {
      toast.error('حدث خطأ: ' + error.message, { id: 'status-update' });
    }
  };

  const cancelActiveRide = async () => {
    if (!activeRide || !window.confirm('هل أنت متأكد من إلغاء هذا المشوار؟')) return;
    const cancellingId = activeRide.id;
    const customerId = activeRide.customer_id;
    activeRideRef.current = null;
    setActiveRide(null);

    toast.loading('جاري إلغاء الرحلة...', { id: 'cancel-ride' });
    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', cancellingId);
    if (!error) {
      toast.error('تم إلغاء الرحلة', { id: 'cancel-ride' });
      if (customerId) {
        sendPushNotification({
          title: '⚠️ اعتذر السائق عن المشوار',
          message: `عذراً، اعتذر الكابتن ${userName || 'السائق'} عن إكمال المشوار. يرجى اختيار سائق آخر متاح.`,
          targetUserId: customerId,
          targetUrl: '/'
        }).catch(console.error);
      }
      fetchDriverData();
    } else {
      toast.error('خطأ: ' + error.message, { id: 'cancel-ride' });
    }
  };

  const finishRide = async () => {
    if (activeRide) {
      const finishedId = activeRide.id;
      const customerId = activeRide.customer_id;
      // Clear active ride references immediately so fetchDriverData never treats this as a cancellation
      activeRideRef.current = null;
      setActiveRide(null);

      await supabase.from('orders').update({
        status: 'delivered',
        payment_status: 'paid'
      }).eq('id', finishedId);

      if (customerId) {
        sendPushNotification({
          title: 'وصلت إلى وجهتك بسلامة الله ✨',
          message: 'تم إنهاء الرحلة بنجاح. شكراً لاختيارك مزار! نتمنى لك عمرة مقبولة وزيارة مباركة.',
          targetUserId: customerId,
          targetUrl: '/'
        }).catch(console.error);
      }
    }
    toast.success('تم إنهاء الرحلة بنجاح. تم تسجيل الأرباح في محفظتك 💰');
    fetchDriverData(); // Refresh stats & wallet
  };

  const handleWalletClick = () => {
    setActiveTab('wallet');
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!profileForm.full_name?.trim()) return toast.error('يرجى إدخال الاسم الكامل');
    if (!profileForm.phone_number?.trim()) return toast.error('يرجى إدخال رقم الهاتف');

    setIsSavingProfile(true);
    const toastId = toast.loading('جاري حفظ البيانات الشخصية...');

    try {
      const trimmedName = profileForm.full_name.trim();
      const trimmedPhone = profileForm.phone_number.trim();
      const trimmedPlate = profileForm.license_plate?.trim() || '';

      // 1. Update users table
      if (driverProfile.userId) {
        const userUpdates = {
          full_name: trimmedName,
          phone_number: trimmedPhone
        };
        if (profileForm.new_password && profileForm.new_password.trim().length >= 3) {
          userUpdates.password_hash = profileForm.new_password.trim();
        }
        const { error: userErr } = await supabase.from('users').update(userUpdates).eq('id', driverProfile.userId);
        if (userErr) throw userErr;
      }

      // 2. Update drivers table
      if (driverId) {
        const { error: driverErr } = await supabase.from('drivers').update({
          vehicle_type: profileForm.vehicle_type,
          license_plate: trimmedPlate
        }).eq('id', driverId);
        if (driverErr) throw driverErr;
      }

      localStorage.setItem('userName', trimmedName);
      setDriverProfile(prev => ({
        ...prev,
        full_name: trimmedName,
        phone_number: trimmedPhone,
        vehicle_type: profileForm.vehicle_type,
        license_plate: trimmedPlate
      }));

      toast.success('تم حفظ وتحديث بياناتك الشخصية بنجاح! ✨', { id: toastId });
      fetchDriverData();
    } catch (err) {
      console.error('Failed to update driver profile:', err);
      toast.error('حدث خطأ أثناء حفظ الملف الشخصي: ' + err.message, { id: toastId });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRequestSettlement = async (e) => {
    if (e) e.preventDefault();
    if (!settlementForm.ccp_number.trim()) {
      return toast.error('يرجى إدخال رقم الحساب البريدي (CCP / BaridiMob) أو رقم الهاتف');
    }
    setIsSubmittingSettlement(true);
    try {
      toast.success('تم إرسال طلب تسوية الحساب إلى إدارة مزار بنجاح! سيتم التواصل معك عبر الواتساب لإتمام التحويل 📲', { duration: 6000 });
      setIsSettlementModalOpen(false);
      setSettlementForm({ ccp_number: '', notes: '' });
    } catch (err) {
      toast.error('حدث خطأ أثناء إرسال طلب التسوية');
    } finally {
      setIsSubmittingSettlement(false);
    }
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

  // Financial calculations for Driver Wallet
  const deliveredOrders = walletOrders.filter(o => o.status === 'delivered');
  const cashDelivered = deliveredOrders.filter(o => (o.payment_method || 'cash') === 'cash');
  const totalCashAmount = cashDelivered.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

  const chargilyDelivered = deliveredOrders.filter(o => o.payment_method === 'card');
  const totalChargilyAmount = chargilyDelivered.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

  const totalGrossRevenue = totalCashAmount + totalChargilyAmount;

  const commPercent = Number(commissionRate) || 10;
  const commFactor = commPercent / 100;
  const platformFeeTotal = totalGrossRevenue * commFactor;
  const platformCashFee = totalCashAmount * commFactor;
  const driverChargilyDue = totalChargilyAmount * (1 - commFactor);
  const netSettlementBalance = driverChargilyDue - platformCashFee;

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
          <button onClick={() => setActiveTab('wallet')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition ${activeTab === 'wallet' ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Wallet size={20} /> المحفظة والأرباح
          </button>
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition ${activeTab === 'profile' ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:bg-gray-50'}`}>
            <User size={20} /> الملف الشخصي
          </button>
        </nav>

        <div className="pt-6 border-t border-gray-100 mt-auto">
          <div 
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-3 mb-4 p-2 cursor-pointer hover:bg-orange-50 rounded-xl transition group"
            title="انقر لتعديل بياناتك الشخصية"
          >
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold group-hover:scale-105 transition">
              <User size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-800 truncate">{driverProfile.full_name || userName}</p>
              <p className="text-xs text-orange-600 font-bold flex items-center gap-1">
                تعديل معلوماتي ✎
              </p>
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
           <span className="text-xl font-black text-gray-800 cursor-pointer" onClick={onGoHome}>مزار سائق</span>
           <button onClick={onLogout} className="text-red-500"><LogOut size={20} /></button>
        </div>

        <div className="flex justify-between items-center mb-8 gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-gray-800 hidden md:block">
              {activeTab === 'home' ? 'لوحة التحكم والطلبات' : activeTab === 'offers' ? 'عروضي وباقاتي' : activeTab === 'wallet' ? 'محفظة السائق والأرباح' : 'الملف الشخصي للسائق'}
            </h1>
            <p className="text-gray-400 text-xs font-bold hidden md:block mt-0.5">
              مرحباً بك {driverProfile.full_name || userName} | سائق مزار
            </p>
          </div>
          <div className="flex items-center gap-3 mr-auto flex-wrap">
            <button 
              onClick={() => { playNewOrderAlert(); toast.success('صوت التنبيه يعمل بنجاح! 🔔'); }}
              className="bg-orange-50 hover:bg-orange-100 text-orange-600 px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-sm border border-orange-200"
              title="فحص جرس التنبيهات"
            >
              <Volume2 size={16} /> فحص جرس التنبيه
            </button>
            <div className="flex items-center gap-2 bg-white p-1 rounded-full shadow-sm border border-gray-100">
              <span className={`text-sm font-bold px-4 py-2 rounded-full transition cursor-pointer ${!isOnline ? 'bg-gray-100 text-gray-800 shadow-inner' : 'text-gray-400 hover:text-gray-600'}`} onClick={() => setIsOnline(false)}>غير متصل</span>
              <span className={`text-sm font-bold px-4 py-2 rounded-full transition cursor-pointer ${isOnline ? 'bg-green-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`} onClick={() => setIsOnline(true)}>متصل للطلبات</span>
            </div>
          </div>
        </div>

        {/* Background Notifications & OEM Battery Optimization Card */}
        <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-emerald-500/10 border border-orange-500/20 rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs text-gray-800">خدمة التنبيهات الأصلية في الخلفية:</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">🟢 متصلة ونشطة</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                تطبيق مزار يستقبل الطلبات ويرن بجرس قوي حتى أثناء إغلاق الشاشة أو استخدام خرائط جوجل
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.NativeBridge && typeof window.NativeBridge.requestIgnoreBatteryOptimizations === 'function') {
                  window.NativeBridge.requestIgnoreBatteryOptimizations();
                  toast.success('تم فتح شاشة تحسين البطارية - اختر "بدون قيود" لضمان وصول التنبيهات دائماً ⚡');
                } else {
                  toast.info('هذه الميزة تعمل داخل تطبيق أندرويد (APK)');
                }
              }}
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              title="إلغاء قيود توفير الطاقة"
            >
              <span>⚡</span>
              <span>استثناء قيود البطارية</span>
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.NativeBridge && typeof window.NativeBridge.openAutoStartSettings === 'function') {
                  window.NativeBridge.openAutoStartSettings();
                  toast.success('تم فتح إعدادات التشغيل التلقائي (شاومي / سامسونج / هواوي)');
                } else {
                  toast.info('هذه الميزة تعمل داخل تطبيق أندرويد (APK)');
                }
              }}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              title="ضبط التشغيل التلقائي للهواتف الصينية"
            >
              <span>⚙️</span>
              <span>التشغيل التلقائي</span>
            </button>
          </div>
        </div>

        {/* Ride & Financial Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div 
            onClick={() => setActiveTab('wallet')}
            className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center transition hover:-translate-y-1 cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-400 text-xs font-bold">مقبوض نقداً (كاش)</span>
              <span className="text-amber-500 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded-full">💵 كاش</span>
            </div>
            <span className="text-2xl font-black text-amber-600">{totalCashAmount.toLocaleString()} د.ج</span>
            <span className="text-[11px] text-gray-400 mt-1 font-bold">{cashDelivered.length} رحلة نقدية عند الوصول</span>
          </div>

          <div 
            onClick={() => setActiveTab('wallet')}
            className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center transition hover:-translate-y-1 cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-400 text-xs font-bold">مدفوع بشارجيلي</span>
              <span className="text-emerald-500 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-full">💳 إلكتروني</span>
            </div>
            <span className="text-2xl font-black text-emerald-600">{totalChargilyAmount.toLocaleString()} د.ج</span>
            <span className="text-[11px] text-gray-400 mt-1 font-bold">{chargilyDelivered.length} رحلة إلكترونية CIB</span>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center transition hover:-translate-y-1">
            <span className="text-gray-400 text-xs font-bold mb-1">الرحلات المكتملة</span>
            <span className="text-2xl font-black text-gray-800">{stats.completedRides}</span>
            <span className="text-[11px] text-gray-400 mt-1 font-bold">إجمالي الرحلات</span>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center transition hover:-translate-y-1">
            <span className="text-gray-400 text-xs font-bold mb-1">التقييم العام</span>
            <span className="text-2xl font-black text-yellow-500">{stats.rating} ★</span>
            <span className="text-[11px] text-gray-400 mt-1 font-bold">تقييم المعتمرين</span>
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
        {/* Driver Live GPS Map Card */}
        {isOnline && !activeRide && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                <h2 className="font-black text-gray-800 text-lg">خريطتك المباشرة كسائق 🚗</h2>
              </div>
              <button
                type="button"
                onClick={handleRefreshDriverGps}
                className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 active:scale-95 text-orange-600 px-3.5 py-2 rounded-xl text-xs font-black transition shadow-xs border border-orange-100"
              >
                <Navigation size={14} /> {myDriverCoords ? 'تحديث موقعي (GPS)' : 'تحديد موقعي الآن 🎯'}
              </button>
            </div>

            <RideMap 
              driverCoords={myDriverCoords}
              height="340px"
            />

            {myDriverCoords ? (
              <p className="text-xs text-gray-500 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                موقعك الحالي محدد وجاهز: ({myDriverCoords[0].toFixed(4)}, {myDriverCoords[1].toFixed(4)})
              </p>
            ) : (
              <div className="flex items-center justify-between bg-orange-50 p-3 rounded-xl border border-orange-100 text-xs text-orange-700 font-bold">
                <span>📍 اضغط على "تحديد موقعي الآن" لتظهر سيارتك على الخريطة ويتمكن المعتمرون من رؤيتك.</span>
                <button onClick={handleRefreshDriverGps} className="underline font-black mr-2">تحديد الآن</button>
              </div>
            )}
          </div>
        )}

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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                <div className="w-4 h-4 bg-green-500 rounded-full animate-ping"></div>
                {activeRide.status === 'driver_offered' ? 'في انتظار موافقة المعتمر...' : 
                 activeRide.status === 'picking_up' ? 'وصلت لموقع العميل 📍 بانتظار الركوب' :
                 activeRide.status === 'in_transit' ? 'الرحلة جارية نحو الوجهة 🚀' :
                 'رحلة مؤكدة - انطلق نحو العميل'}
              </h2>
              <span className="bg-orange-100 text-orange-600 font-black px-6 py-2 rounded-2xl text-xl">
                {activeRide.price} د.ج
              </span>
            </div>

            {/* Interactive Live Route Map */}
            <RideMap 
              pickupAddress={activeRide.pickup} 
              dropoffAddress={activeRide.dropoff} 
              pickupCoords={activeRide.lat && activeRide.lng ? [activeRide.lat, activeRide.lng] : null}
              driverCoords={myDriverCoords}
              height="360px"
              className="mb-6"
            />

            {/* Payment Method Details */}
            <div className={`p-4 rounded-2xl flex items-center justify-between mb-6 ${activeRide.paymentMethod === 'card' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                <Wallet size={18} />
                <span>
                  {activeRide.paymentMethod === 'card' ? 'طريقة الدفع: إلكتروني (تم الدفع مسبقاً عبر Chargily)' : 'طريقة الدفع: نقداً عند الوصول (يُرجى تحصيل المبلغ من العميل)'}
                </span>
              </div>
              <span className="font-black text-base">{activeRide.price} د.ج</span>
            </div>
            
            <div className="space-y-6 mb-8 bg-gray-50 p-6 rounded-2xl">
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

            {/* Direct WhatsApp Contact Button */}
            {activeRide.customerPhone && (
              <a 
                href={`https://wa.me/${activeRide.customerPhone.replace(/\D/g, '')}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-full bg-[#25D366] text-white font-bold py-3.5 rounded-2xl hover:bg-[#1da851] transition shadow-md flex items-center justify-center gap-2 mb-4"
              >
                <span>تواصل عبر واتساب مع العميل ({activeRide.customerName || 'المعتمر'})</span>
              </a>
            )}

            {activeRide.status === 'accepted' ? (
              <div className="space-y-3">
                <button onClick={notifyArrival} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition flex items-center justify-center gap-2">
                  <MapPin size={22} /> وصلت إلى موقع المعتمر 📍
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={finishRide} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black py-3.5 rounded-2xl shadow hover:-translate-y-0.5 transition">
                    إنهاء الرحلة
                  </button>
                  <button onClick={cancelActiveRide} className="bg-red-50 text-red-600 font-bold py-3.5 rounded-2xl hover:bg-red-100 transition">
                    إلغاء الرحلة
                  </button>
                </div>
              </div>
            ) : activeRide.status === 'picking_up' ? (
              <div className="space-y-3">
                <button onClick={startRide} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition flex items-center justify-center gap-2">
                  <Navigation size={22} /> بدء الرحلة نحو الوجهة 🚀
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={finishRide} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black py-3.5 rounded-2xl shadow hover:-translate-y-0.5 transition">
                    إنهاء الرحلة
                  </button>
                  <button onClick={cancelActiveRide} className="bg-red-50 text-red-600 font-bold py-3.5 rounded-2xl hover:bg-red-100 transition">
                    إلغاء الرحلة
                  </button>
                </div>
              </div>
            ) : activeRide.status === 'in_transit' ? (
              <button onClick={finishRide} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-xl py-5 rounded-2xl shadow-[0_10px_20px_rgba(34,197,94,0.3)] hover:shadow-[0_15px_30px_rgba(34,197,94,0.4)] hover:-translate-y-1 transition">
                إنهاء الرحلة بنجاح ✨
              </button>
            ) : (
              <div className="space-y-3">
                <div className="text-center p-4 bg-orange-50 text-orange-600 rounded-xl font-bold animate-pulse">
                  تم عرض السعر ({activeRide.price} د.ج) على المعتمر، يرجى الانتظار حتى يقبل...
                </div>
                <button onClick={cancelActiveRide} className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-red-50 hover:text-red-600 transition text-sm">
                  سحب العرض وإلغاء الطلب
                </button>
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
                        <span className="text-orange-500 font-bold text-sm bg-orange-50 px-3 py-1 rounded-lg flex items-center gap-1">
                          <Navigation size={14}/> {req.isDirect ? 'طلب مباشر لك' : req.time}
                        </span>
                        <span className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">{req.price} {req.price !== 'قابل للتفاوض' && 'د.ج'}</span>
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
                      
                      {rejectedOrders.includes(req.id) && (
                        <div className="mt-4 bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-center gap-2">
                          <AlertCircle size={16} className="shrink-0" />
                          <span>قام المعتمر برفض سعرك الذي اقترحته، أو قام بإلغاء الطلب. يمكنك محاولة تقديم سعر أقل الآن!</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 mt-auto">
                      <button onClick={() => rejectRideRequest(req.id, req.customer_id)} className="bg-gray-50 p-4 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition" title="رفض الطلب">
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

        {/* Wallet Section */}
        {activeTab === 'wallet' && (
          <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white p-8 rounded-3xl shadow-lg relative overflow-hidden">
              <div className="absolute -left-10 -bottom-10 w-44 h-44 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold mb-3 backdrop-blur-xs">
                  <Sparkles size={14} /> محفظة السائق المالية
                </div>
                <h2 className="text-3xl font-black mb-1">الأرباح والمستحقات المالية</h2>
                <p className="text-orange-100 text-sm font-bold">
                  متابعة دقيقة لما تم قبضه نقداً عند الوصول، مدفوعات شارجيلي، ومستحقات عمولة المنصة ({commPercent}%).
                </p>
              </div>

              <div className="relative z-10 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSettlementModalOpen(true)}
                  className="bg-white text-orange-600 hover:bg-orange-50 active:scale-95 px-6 py-3.5 rounded-2xl font-black text-sm transition shadow-md flex items-center gap-2"
                >
                  <DollarSign size={18} /> طلب تسوية / سحب الرصيد
                </button>
                <button
                  type="button"
                  onClick={fetchDriverData}
                  className="bg-white/20 hover:bg-white/30 text-white p-3.5 rounded-2xl transition"
                  title="تحديث البيانات"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>

            {/* 4 Financial Grid Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Cash collected upon arrival */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 p-6 rounded-3xl border-2 border-amber-200/80 shadow-sm relative overflow-hidden">
                <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center mb-4 shadow-md shadow-amber-500/20">
                  <Wallet size={24} />
                </div>
                <p className="text-xs font-black text-amber-800 mb-1">ما قبضته نقداً عند الوصول 💵</p>
                <p className="text-3xl font-black text-amber-950 mb-2">{totalCashAmount.toLocaleString()} <span className="text-lg">د.ج</span></p>
                <div className="border-t border-amber-200/60 pt-3 flex flex-col gap-1 text-xs">
                  <span className="text-amber-800 font-bold">{cashDelivered.length} رحلة نقدية مستلمة مباشرة</span>
                  <span className="text-gray-500 text-[11px]">مبالغ سددها المعتمرون نقداً في يدك</span>
                </div>
              </div>

              {/* Card 2: Chargily Online Payments */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 p-6 rounded-3xl border-2 border-emerald-200/80 shadow-sm relative overflow-hidden">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mb-4 shadow-md shadow-emerald-500/20">
                  <CreditCard size={24} />
                </div>
                <p className="text-xs font-black text-emerald-800 mb-1">ما تم دفعه بشارجيلي (Chargily) 💳</p>
                <p className="text-3xl font-black text-emerald-950 mb-2">{totalChargilyAmount.toLocaleString()} <span className="text-lg">د.ج</span></p>
                <div className="border-t border-emerald-200/60 pt-3 flex flex-col gap-1 text-xs">
                  <span className="text-emerald-800 font-bold">{chargilyDelivered.length} رحلة مدفوعة بالبطاقة الذهبية / CIB</span>
                  <span className="text-gray-500 text-[11px]">محفوظة لك في حساب المنصة الإلكتروني</span>
                </div>
              </div>

              {/* Card 3: Platform Dues */}
              <div className="bg-gradient-to-br from-rose-50 to-red-50/40 p-6 rounded-3xl border-2 border-rose-200/80 shadow-sm relative overflow-hidden">
                <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center mb-4 shadow-md shadow-rose-500/20">
                  <Percent size={24} />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-black text-rose-800">مستحقات المنصة (عمولة الإدارة)</p>
                  <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full">{commPercent}%</span>
                </div>
                <p className="text-3xl font-black text-rose-950 mb-2">{platformFeeTotal.toFixed(0)} <span className="text-lg">د.ج</span></p>
                <div className="border-t border-rose-200/60 pt-3 flex flex-col gap-1 text-xs">
                  <span className="text-rose-800 font-bold">نسبة العمولة: {commPercent}% محددة من الأدمن</span>
                  <span className="text-gray-500 text-[11px]">تُحسب تلقائياً من إجمالي الرحلات</span>
                </div>
              </div>

              {/* Card 4: Total Revenue */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center mb-4 shadow-md">
                  <Car size={24} />
                </div>
                <p className="text-xs font-black text-gray-500 mb-1">إجمالي الدخل الكلي للرحلات</p>
                <p className="text-3xl font-black text-gray-900 mb-2">{totalGrossRevenue.toLocaleString()} <span className="text-lg">د.ج</span></p>
                <div className="border-t border-gray-100 pt-3 flex flex-col gap-1 text-xs">
                  <span className="text-gray-800 font-bold">{deliveredOrders.length} رحلة مكتملة إجمالاً</span>
                  <span className="text-gray-400 text-[11px]">مجموع الكاش + شارجيلي</span>
                </div>
              </div>
            </div>

            {/* Net Settlement Banner */}
            <div className={`p-8 rounded-3xl border-2 transition relative overflow-hidden ${
              netSettlementBalance > 0 
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-400 shadow-lg' 
                : netSettlementBalance < 0 
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-400 shadow-lg' 
                : 'bg-white text-gray-800 border-gray-200 shadow-sm'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                    <CheckCircle2 size={14} /> خلاصة التسوية والحساب الصافي
                  </div>
                  <h3 className="text-3xl font-black">
                    {netSettlementBalance > 0 
                      ? `رصيد أرباح مستحق لك في ذمة المنصة: +${netSettlementBalance.toFixed(0)} د.ج` 
                      : netSettlementBalance < 0 
                      ? `مستحقات عمولة واجب تسديدها لإدارة المنصة: ${Math.abs(netSettlementBalance).toFixed(0)} د.ج` 
                      : 'الحساب خالص ومتوازن تماماً (0 د.ج)'}
                  </h3>
                  <p className="text-sm opacity-90 leading-relaxed max-w-2xl font-bold">
                    {netSettlementBalance > 0
                      ? `أرباحك المحصلة إلكترونياً عبر شارجيلي (${(totalChargilyAmount * (1 - commFactor)).toFixed(0)} د.ج) تفوق عمولة المنصة على الكاش (${platformCashFee.toFixed(0)} د.ج)، يمكنك طلب تحويل الفائض لحسابك البريدي أو البنكي الآن.`
                      : netSettlementBalance < 0
                      ? `استلمت نقداً في يدك مبالغ كاش تستحق المنصة نسبة (${commPercent}%) منها مقدرة بـ ${platformCashFee.toFixed(0)} د.ج، مطروحاً منها نصيبك من شارجيلي. يرجى تسوية الحساب مع الإدارة دورياً.`
                      : `تمت تسوية جميع العمولات والمستحقات بالكامل.`}
                  </p>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsSettlementModalOpen(true)}
                    className="bg-white text-gray-900 hover:bg-gray-100 active:scale-95 px-8 py-4 rounded-2xl font-black text-base shadow-xl transition flex items-center gap-2"
                  >
                    {netSettlementBalance > 0 ? 'طلب تحويل رصيد الأرباح' : 'طلب تسوية الحساب مع الإدارة'}
                  </button>
                </div>
              </div>
            </div>

            {/* Trip Ledger Breakdown */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black text-gray-800">سجل الرحلات وتفاصيل العمولات</h3>
                  <p className="text-gray-400 text-xs font-bold mt-1">كشف تفصيلي بكل مشوار أنجزته وطريقة تسديده وحصة المنصة منه</p>
                </div>
                <span className="bg-gray-100 text-gray-600 text-xs font-black px-3 py-1.5 rounded-xl">
                  {deliveredOrders.length} رحلة
                </span>
              </div>

              {deliveredOrders.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-2xl text-gray-400">
                  <Car size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold">لا توجد رحلات مكتملة بعد في سجلك المالي</p>
                  <p className="text-xs mt-1">أكمل أول رحلة لتظهر أرباحها وعمولاتها هنا فوراً</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveredOrders.map((order, index) => {
                    const price = parseFloat(order.total_amount) || 0;
                    const fee = price * commFactor;
                    const driverNet = price - fee;
                    const isCard = order.payment_method === 'card';

                    return (
                      <div 
                        key={order.id || index}
                        className="bg-gray-50 hover:bg-orange-50/30 p-5 rounded-2xl border border-gray-100 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                            isCard ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                          }`}>
                            {isCard ? <CreditCard size={22} /> : <Wallet size={22} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-black text-gray-800 text-sm">
                                {order.users?.full_name || 'معتمر كريم'}
                              </span>
                              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                isCard ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {isCard ? '💳 إلكتروني عبر شارجيلي' : '💵 نقداً عند الوصول'}
                              </span>
                              <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                                مكتملة وخالصة ✅
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 font-bold flex items-center gap-1.5">
                              <span>📍 من: {order.pickup_address}</span>
                              <span className="text-gray-300">•</span>
                              <span>إلى: {order.dropoff_address}</span>
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {order.created_at ? new Date(order.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'مؤخراً'}
                            </p>
                          </div>
                        </div>

                        {/* Breakdown pills */}
                        <div className="flex items-center gap-3 md:gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-gray-200">
                          <div className="text-right">
                            <span className="text-[10px] text-gray-400 block font-bold">قيمة الرحلة</span>
                            <span className="font-black text-gray-800 text-sm">{price} د.ج</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-rose-500 block font-bold">عمولة المنصة ({commPercent}%)</span>
                            <span className="font-black text-rose-600 text-sm">-{fee.toFixed(0)} د.ج</span>
                          </div>
                          <div className="text-right bg-white p-2.5 rounded-xl border border-gray-100 shadow-2xs">
                            <span className="text-[10px] text-emerald-600 block font-bold">صافي دخل السائق</span>
                            <span className="font-black text-emerald-700 text-base">+{driverNet.toFixed(0)} د.ج</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Section */}
        {activeTab === 'profile' && (
          <div className="space-y-8 pb-10">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-gray-100">
                <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-orange-500/20 font-black text-3xl shrink-0">
                  <User size={48} />
                </div>
                <div className="text-center sm:text-right flex-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1 flex-wrap">
                    <h2 className="text-3xl font-black text-gray-800">{driverProfile.full_name || userName}</h2>
                    <span className="bg-green-100 text-green-700 font-black text-xs px-3 py-1 rounded-full">
                      سائق معتمد ونشط ✓
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm font-bold mb-3">{driverProfile.phone_number || 'لم يتم تسجيل رقم الهاتف'}</p>
                  <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap text-xs">
                    <span className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                      <Car size={14} className="text-orange-500" /> {driverProfile.vehicle_type || 'سيارة خاصة'}
                    </span>
                    {driverProfile.license_plate && (
                      <span className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                        <FileText size={14} className="text-orange-500" /> اللوحة: {driverProfile.license_plate}
                      </span>
                    )}
                    <span className="bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-xl font-black flex items-center gap-1.5">
                      <Star size={14} className="fill-yellow-500 text-yellow-500" /> {driverProfile.rating} نجوم
                    </span>
                  </div>
                </div>
              </div>

              {/* Edit Personal Information Form */}
              <div className="pt-8">
                <h3 className="text-xl font-black text-gray-800 mb-2">تعديل المعلومات والبيانات الشخصية</h3>
                <p className="text-gray-400 text-sm font-bold mb-6">قم بتحديث اسمك، رقم هاتفك لتواصل المعتمرين عبر الواتساب، ونوع مركبتك في أي وقت.</p>

                <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl">
                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2">الاسم الكامل للسائق</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={profileForm.full_name} 
                        onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })} 
                        className="w-full bg-gray-50 border-2 border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl py-3 px-4 text-base font-bold text-gray-800 outline-none transition" 
                        placeholder="مثال: أحمد عبد الله الجزائري"
                        required 
                      />
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2">رقم الهاتف / الواتساب للتواصل مع المعتمرين</label>
                    <div className="relative">
                      <input 
                        type="tel" 
                        value={profileForm.phone_number} 
                        onChange={e => setProfileForm({ ...profileForm, phone_number: e.target.value })} 
                        className="w-full bg-gray-50 border-2 border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl py-3 px-4 text-base font-bold text-gray-800 outline-none transition" 
                        placeholder="مثال: 0550123456 أو 966500000000"
                        dir="ltr"
                        required 
                      />
                      <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 font-bold">يستخدم هذا الرقم في زر التواصل المباشر عبر واتساب الذي يظهر للمعتمر عند قبول الرحلة.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2">نوع المركبة والسيارة</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-3">
                      {[
                        { id: 'سيارة سيدان مريحة', label: '🚗 سيدان مريحة' },
                        { id: 'سيارة عائلية 7 ركاب', label: '🚐 عائلية 7 ركاب' },
                        { id: 'فان سياحي / باص صغير', label: '🚌 فان سياحي' },
                        { id: 'سيارة VIP فاخرة', label: '⭐ VIP فاخرة' },
                        { id: 'باص معتمرين كبير', label: '🚎 باص معتمرين' },
                      ].map(v => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setProfileForm({ ...profileForm, vehicle_type: v.id })}
                          className={`p-3 rounded-2xl text-xs font-black transition border-2 text-center ${
                            profileForm.vehicle_type === v.id 
                              ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm' 
                              : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                    <input 
                      type="text" 
                      value={profileForm.vehicle_type} 
                      onChange={e => setProfileForm({ ...profileForm, vehicle_type: e.target.value })} 
                      className="w-full bg-gray-50 border-2 border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl py-2.5 px-4 text-sm font-bold text-gray-800 outline-none transition" 
                      placeholder="أو اكتب نوع مركبتك مخصصاً..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2">رقم لوحة ترقيم السيارة (License Plate)</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={profileForm.license_plate} 
                        onChange={e => setProfileForm({ ...profileForm, license_plate: e.target.value })} 
                        className="w-full bg-gray-50 border-2 border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl py-3 px-4 text-base font-bold text-gray-800 outline-none transition font-mono" 
                        placeholder="مثال: 01452-116-16"
                        dir="ltr"
                      />
                      <Car size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2">تغيير كلمة المرور (اختياري)</label>
                    <div className="relative">
                      <input 
                        type="password" 
                        value={profileForm.new_password} 
                        onChange={e => setProfileForm({ ...profileForm, new_password: e.target.value })} 
                        className="w-full bg-gray-50 border-2 border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl py-3 px-4 text-base font-bold text-gray-800 outline-none transition" 
                        placeholder="اتركها فارغة إذا كنت لا ترغب بتغييرها"
                      />
                      <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit" 
                      disabled={isSavingProfile}
                      className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-orange-500/20 hover:shadow-xl hover:-translate-y-0.5 transition active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Check size={20} />
                      {isSavingProfile ? 'جاري حفظ المعلومات...' : 'حفظ المعلومات الشخصية'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-12">
          <Footer />
        </div>

      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around p-2 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
         <button onClick={() => setActiveTab('home')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-orange-600' : 'text-gray-400'}`}>
           <Home size={22} />
           <span className="text-[10px] font-bold">الرئيسية</span>
         </button>
         <button onClick={() => setActiveTab('offers')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'offers' ? 'text-orange-600' : 'text-gray-400'}`}>
           <ListIcon size={22} />
           <span className="text-[10px] font-bold">العروض</span>
         </button>
         <button onClick={() => setActiveTab('wallet')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'wallet' ? 'text-orange-600' : 'text-gray-400'}`}>
           <Wallet size={22} />
           <span className="text-[10px] font-bold">المحفظة</span>
         </button>
         <button onClick={() => setActiveTab('profile')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-orange-600' : 'text-gray-400'}`}>
           <User size={22} />
           <span className="text-[10px] font-bold">حسابي</span>
         </button>
      </div>

      {/* Price Negotiation Modal */}
      {pricePrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl transform scale-100 transition-transform relative overflow-hidden animate-[bounce_1s_ease-in-out]">
            <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-red-600 to-orange-500"></div>
            <button onClick={() => setPricePrompt(null)} className="absolute top-6 left-6 text-gray-400 hover:text-red-500 transition bg-gray-100 hover:bg-red-50 p-2 rounded-full">
              <CloseIcon size={20} />
            </button>
            <h3 className="text-2xl font-black text-gray-800 mb-2">تقديم عرض سعر</h3>
            <p className="text-gray-500 mb-6 font-bold text-sm">هذا الطلب حر، أدخل السعر الذي يناسبك لهذه الرحلة.</p>
            
            <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl mb-6 shadow-inner">
               <div className="flex items-start gap-3 mb-3">
                 <div className="mt-1"><div className="w-3 h-3 rounded-full bg-gray-300"></div></div>
                 <span className="font-bold text-gray-700">{pricePrompt.pickup}</span>
               </div>
               <div className="flex items-start gap-3 mb-4">
                 <MapPin size={16} className="text-red-500 mt-0.5" />
                 <span className="font-black text-gray-800">{pricePrompt.dropoff}</span>
               </div>
               {pricePrompt.customerPhone && (
                 <div className="border-t border-orange-100 pt-4 mt-2">
                   <a href={`https://wa.me/${pricePrompt.customerPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] text-white font-bold py-3 rounded-xl hover:bg-[#1da851] transition shadow-md flex items-center justify-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                     تواصل واتساب للاستفسار
                   </a>
                 </div>
               )}
            </div>

            <form onSubmit={submitPriceOffer}>
              <div className="relative mb-6 group">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 font-black text-xl select-none">د.ج</div>
                <input 
                  type="number" 
                  value={newOfferPrice} 
                  onChange={(e) => setNewOfferPrice(e.target.value)} 
                  placeholder="مثال: 1500" 
                  className="w-full bg-gray-50 border-2 border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl py-4 pr-16 pl-4 text-3xl font-black text-center text-gray-800 outline-none transition shadow-sm"
                  autoFocus
                />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-red-600 to-orange-500 text-white font-black text-xl py-4 rounded-2xl shadow-[0_10px_20px_rgba(249,115,22,0.3)] hover:shadow-[0_15px_30px_rgba(249,115,22,0.4)] hover:-translate-y-1 transition active:scale-95">
                إرسال العرض للمعتمر
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Settlement Request Modal */}
      {isSettlementModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl relative overflow-hidden animate-[fade-in_0.2s_ease-out]">
            <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-orange-500 to-amber-500"></div>
            <button 
              type="button"
              onClick={() => setIsSettlementModalOpen(false)} 
              className="absolute top-6 left-6 text-gray-400 hover:text-red-500 transition bg-gray-100 hover:bg-red-50 p-2 rounded-full"
            >
              <CloseIcon size={20} />
            </button>
            
            <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-4">
              <DollarSign size={28} />
            </div>

            <h3 className="text-2xl font-black text-gray-800 mb-1">طلب تسوية الحساب المالي</h3>
            <p className="text-gray-500 mb-6 font-bold text-sm">
              أدخل بيانات حسابك (بريدي موب / CCP) لإرسال طلب التحويل والمطابقة إلى إدارة المنصة.
            </p>

            <div className="bg-orange-50/60 border border-orange-100 p-4 rounded-2xl mb-6 flex justify-between items-center">
              <div>
                <span className="text-xs text-gray-500 font-bold block">الرصيد الصافي الحالي:</span>
                <span className={`text-xl font-black ${netSettlementBalance >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {netSettlementBalance >= 0 ? `+${netSettlementBalance.toFixed(0)} د.ج (لك)` : `${netSettlementBalance.toFixed(0)} د.ج (عليك)`}
                </span>
              </div>
              <div className="text-left text-xs text-gray-500 font-bold">
                <div>نسبة المنصة: {commPercent}%</div>
                <div>الرحلات المنفذة: {deliveredOrders.length}</div>
              </div>
            </div>

            <form onSubmit={handleRequestSettlement} className="space-y-4">
              <div>
                <label className="block text-sm font-black text-gray-700 mb-1.5">
                  رقم الحساب البريدي الجاري (CCP / RIP) أو رقم BaridiMob
                </label>
                <input 
                  type="text" 
                  value={settlementForm.ccp_number} 
                  onChange={(e) => setSettlementForm({ ...settlementForm, ccp_number: e.target.value })} 
                  placeholder="مثال: 00799999000000000000 أو رقم الهاتف" 
                  className="w-full bg-gray-50 border-2 border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl py-3 px-4 text-base font-bold text-gray-800 outline-none transition"
                  dir="ltr"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-1.5">
                  ملاحظات إضافية (اختياري)
                </label>
                <textarea 
                  value={settlementForm.notes} 
                  onChange={(e) => setSettlementForm({ ...settlementForm, notes: e.target.value })} 
                  placeholder="أي توضيحات أو تفاصيل ترغب في إيصالها للإدارة..." 
                  className="w-full bg-gray-50 border-2 border-gray-200 focus:border-orange-500 focus:bg-white rounded-2xl py-3 px-4 text-sm font-bold text-gray-800 outline-none transition resize-none h-24"
                ></textarea>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSettlementModalOpen(false)}
                  className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-2xl transition"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingSettlement}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-lg py-3.5 rounded-2xl shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingSettlement ? 'جاري الإرسال...' : 'تأكيد وإرسال الطلب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
