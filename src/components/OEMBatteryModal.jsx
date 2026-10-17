import React, { useState, useEffect } from 'react';
import { BatteryCharging, Zap, ShieldCheck, X, AlertTriangle, ArrowRight, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OEMBatteryModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const isAndroid = /Android/i.test(navigator.userAgent);

  const handleOpenBatteryOptimization = () => {
    // If running in Capacitor with Native Bridge
    if (window.NativeBridge?.requestIgnoreBatteryOptimizations) {
      window.NativeBridge.requestIgnoreBatteryOptimizations();
      toast.success('تم فتح شاشة تحسين البطارية');
    } else {
      toast('يرجى الدخول إلى ضبط هاتفك ⬅️ التطبيقات ⬅️ مزار ⬅️ البطارية ⬅️ اختر (غير مقيّد / Unrestricted)', {
        duration: 6000,
        icon: '⚡'
      });
    }
  };

  const handleOpenAutoStart = () => {
    // If running in Capacitor with Native Bridge
    if (window.NativeBridge?.openAutoStartSettings) {
      window.NativeBridge.openAutoStartSettings();
      toast.success('تم فتح إعدادات التشغيل التلقائي');
    } else {
      toast('لمستخدمي شاومي وهواوي وأوبو: فعّل خيار (التشغيل التلقائي / AutoStart) لضمان وصول طلبات التوصيل فورياً', {
        duration: 6000,
        icon: '📱'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-orange-100 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
            <BatteryCharging size={26} />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900">ضمان استلام طلبات المشاوير فورياً</h3>
            <p className="text-xs text-orange-600 font-bold">إعدادات البطارية للأجهزة الذكية (شاومي، سامسونج، هواوي، أوبو)</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          تقوم بعض أنظمة أندرويد (مثل HyperOS / MIUI و ColorOS) بإيقاف عمل التطبيقات بالخلفية لتوفير البطارية، مما قد يؤخر رنين تنبيهات المشاوير الجديدة عند قفل الشاشة.
        </p>

        <div className="space-y-3 mb-6">
          <div className="bg-orange-50 border border-orange-200/80 rounded-2xl p-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-gray-900 text-sm mb-1">
                <Zap size={16} className="text-orange-500" />
                <span>1. إيقاف قيود البطارية (بدون قيود)</span>
              </div>
              <p className="text-xs text-gray-500">
                يسمح للتطبيق بإيقاظ الهاتف ورنين التنبيه بمجرد وصول طلب معتمر أو سائق.
              </p>
            </div>
            <button
              onClick={handleOpenBatteryOptimization}
              className="bg-white hover:bg-orange-500 hover:text-white text-orange-600 border border-orange-200 px-3 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap shadow-sm"
            >
              ضبط البطارية
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-gray-900 text-sm mb-1">
                <Settings size={16} className="text-amber-600" />
                <span>2. تفعيل التشغيل التلقائي (AutoStart)</span>
              </div>
              <p className="text-xs text-gray-500">
                ضروري جداً لهواتف Xiaomi و Redmi و Huawei للعمل بعد إغلاق التطبيق.
              </p>
            </div>
            <button
              onClick={handleOpenAutoStart}
              className="bg-white hover:bg-amber-600 hover:text-white text-amber-700 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap shadow-sm"
            >
              التشغيل التلقائي
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-orange-600/20 hover:opacity-95 transition text-sm flex items-center justify-center gap-2"
          >
            <ShieldCheck size={18} />
            تم، تطبيق الإعدادات
          </button>
        </div>
      </div>
    </div>
  );
}
