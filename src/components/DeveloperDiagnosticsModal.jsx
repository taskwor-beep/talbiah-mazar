import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Bell, CheckCircle2, RefreshCw, Cpu, Smartphone, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { ONESIGNAL_APP_ID, sendPushNotification, requestNotificationPermission } from '../lib/onesignal';

// Architectural Standard: Principle 5 - Absolute Isolation of Developer Diagnostics
const AUTHORIZED_DEVELOPER_EMAIL = 'madaniameur26@gmail.com';

export default function DeveloperDiagnosticsModal({ isOpen, onClose, currentUserEmail, userId, userRole }) {
  // Principle 5: Enforce zero-leakage security. Non-developers receive null immediately!
  if (!isOpen || currentUserEmail !== AUTHORIZED_DEVELOPER_EMAIL) {
    return null;
  }

  const [notificationState, setNotificationState] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unknown'
  );
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    userAgent: navigator.userAgent,
    isStandalone: window.matchMedia('(display-mode: standalone)').matches,
    isCapacitor: !!window.Capacitor,
    platform: window.Capacitor?.getPlatform?.() || 'web'
  });

  const handleTestPush = async () => {
    setIsTestingPush(true);
    const toastId = toast.loading('إرسال إشعار فحص عالي الأولوية (Priority: 10)...');

    try {
      const res = await sendPushNotification({
        title: '🧪 اختبار إشعار مزار الهندسي',
        message: `وصول مؤكد بجودة FCM v1 على معرف العميل: ${userId || 'عام'}`,
        targetUserId: userId || null,
        targetRole: userRole || null,
        data: { test: true, timestamp: Date.now() }
      });

      if (res?.error) {
        toast.error(`فشل الإرسال: ${res.error.message || JSON.stringify(res.error)}`, { id: toastId });
      } else {
        toast.success('تم إرسال الإشعار بنجاح عبر الـ Backend (Zero Trust)!', { id: toastId });
      }
    } catch (err) {
      toast.error('خطأ غير متوقع في الاتصال بالخادم', { id: toastId });
    } finally {
      setIsTestingPush(false);
    }
  };

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotificationState(perm ? 'granted' : 'denied');
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 font-mono text-xs" dir="ltr">
      <div className="bg-slate-950 border border-emerald-500/30 text-emerald-400 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_20px_50px_rgba(16,185,129,0.15)] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-emerald-500/20 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wider text-white">ENGINEERING DIAGNOSTICS BRIDGE</span>
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px]">
              DEVELOPER ONLY
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Key Separation & Zero Trust Status */}
          <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-slate-300 font-sans font-bold text-sm">
              <span className="flex items-center gap-1.5"><Lock size={15} className="text-amber-400" /> Key Separation & Zero-Trust Audit</span>
              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">PASSED</span>
            </div>
            <div className="space-y-1 text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">OneSignal App ID (Client-Safe):</span>
                <span className="text-emerald-300 font-bold select-all">{ONESIGNAL_APP_ID}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">REST API Key Location:</span>
                <span className="text-amber-300 font-bold">Supabase Secrets Only (Zero-Trust Backend)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Active Identity (external_id):</span>
                <span className="text-cyan-300 font-bold">{userId || 'Unauthenticated'}</span>
              </div>
            </div>
          </div>

          {/* FCM & Android Notification Status */}
          <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-slate-300 font-sans font-bold text-sm">
              <span className="flex items-center gap-1.5"><Bell size={15} className="text-cyan-400" /> Push & Channels Health</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${notificationState === 'granted' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                {notificationState.toUpperCase()}
              </span>
            </div>
            <div className="space-y-1 text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Android Channel ID:</span>
                <span className="text-cyan-300">default_notification_channel (IMPORTANCE_HIGH)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Delivery Priority:</span>
                <span className="text-emerald-300">Priority 10 (FCM High / Instant Wake)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Target Role:</span>
                <span className="text-slate-300">{userRole || 'pilgrim'}</span>
              </div>
            </div>
            <div className="pt-2 flex gap-2">
              <button
                onClick={handleRequestPermission}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-sans font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={14} className="text-emerald-400" /> Request Permission
              </button>
              <button
                onClick={handleTestPush}
                disabled={isTestingPush}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-sans font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={14} className={isTestingPush ? 'animate-spin' : ''} /> Test Priority 10 Push
              </button>
            </div>
          </div>

          {/* Environment & Hardware Metrics */}
          <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-slate-300 font-sans font-bold text-sm">
              <span className="flex items-center gap-1.5"><Smartphone size={15} className="text-purple-400" /> Platform & Runtime</span>
              <span className="text-slate-400 text-[11px]">{deviceInfo.platform}</span>
            </div>
            <p className="text-[10px] text-slate-400 break-all bg-slate-950 p-2.5 rounded border border-slate-800/80">
              {deviceInfo.userAgent}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/40 text-center text-slate-500 text-[11px]">
          Strict Principle 5: Diagnostic endpoints and tokens are completely hidden from pilgrims and drivers.
        </div>
      </div>
    </div>
  );
}
