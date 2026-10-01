import React, { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function GlobalPopups({ userRole }) {
  const [socialPopup, setSocialPopup] = useState(null);
  const [adPopup, setAdPopup] = useState(null);

  useEffect(() => {
    if (userRole === 'admin') return;
    fetchPopups();
  }, [userRole]);

  const fetchPopups = async () => {
    const { data } = await supabase.from('admin_settings').select('*');
    if (!data) return;
    
    let tempSocial = null;
    let tempAd = null;

    data.forEach(item => {
      if (item.key === 'social_popup' && item.value.is_active) {
        tempSocial = item.value;
      }
      if (item.key === 'ad_popup' && item.value.is_active) {
        tempAd = item.value;
      }
    });

    if (tempSocial) {
      const storedVersion = localStorage.getItem('social_popup_version');
      if (tempSocial.frequency === 'always' || !storedVersion || parseInt(storedVersion) < (tempSocial.version || 1)) {
        setSocialPopup(tempSocial);
      }
    }

    if (tempAd) {
      const storedVersion = localStorage.getItem('ad_popup_version');
      if (tempAd.frequency === 'always' || !storedVersion || parseInt(storedVersion) < (tempAd.version || 1)) {
        setAdPopup(tempAd);
      }
    }
  };

  const closeSocial = () => {
    if (socialPopup.frequency === 'once') {
      localStorage.setItem('social_popup_version', socialPopup.version || 1);
    }
    setSocialPopup(null);
  };

  const closeAd = () => {
    if (adPopup.frequency === 'once') {
      localStorage.setItem('ad_popup_version', adPopup.version || 1);
    }
    setAdPopup(null);
  };

  return (
    <>
      {socialPopup && (
        <div 
          className="fixed bottom-6 right-6 max-w-sm w-full bg-gradient-to-br from-blue-600 to-purple-700 rounded-3xl p-6 text-white shadow-[0_20px_50px_rgba(37,99,235,0.3)] z-[100] transition-transform hover:-translate-y-2 border border-white/20"
          dir="rtl"
        >
          <button onClick={closeSocial} className="absolute top-4 left-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition"><X size={16}/></button>
          <div className="flex items-start gap-4">
            <div className="animate-pulse bg-white/20 p-3 rounded-2xl">
              <ExternalLink size={24} />
            </div>
            <div>
              <h3 className="font-black text-xl mb-1">{socialPopup.title}</h3>
              <p className="text-blue-100 text-sm mb-4 leading-relaxed">{socialPopup.description}</p>
              <a href={socialPopup.link} target="_blank" rel="noreferrer" onClick={closeSocial} className="bg-white text-blue-700 px-6 py-2 rounded-full font-black text-sm inline-flex items-center gap-2 hover:shadow-lg transition hover:bg-blue-50">
                المتابعة الآن
              </a>
            </div>
          </div>
        </div>
      )}

      {adPopup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-[2rem] max-w-lg w-full relative overflow-hidden shadow-2xl transform transition-all scale-100">
             <button onClick={closeAd} className="absolute top-4 left-4 p-2 bg-black/10 hover:bg-black/20 text-gray-800 rounded-full transition z-10"><X size={20}/></button>
             {adPopup.image_url ? (
               <img src={adPopup.image_url} alt="Ad" className="w-full h-56 object-cover" />
             ) : (
               <div className="w-full h-32 bg-gradient-to-br from-orange-400 to-red-500"></div>
             )}
             <div className="p-8 text-center relative">
               <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md">
                 <span className="text-3xl">✨</span>
               </div>
               <h2 className="text-3xl font-black text-slate-800 mb-4 mt-6">{adPopup.title}</h2>
               <p className="text-slate-600 mb-8 leading-relaxed text-lg">{adPopup.description}</p>
               <button onClick={closeAd} className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-black py-4 rounded-xl hover:shadow-[0_10px_20px_rgba(234,88,12,0.3)] hover:-translate-y-1 transition text-lg">
                 حسناً، استمر
               </button>
             </div>
          </div>
        </div>
      )}
    </>
  );
}
