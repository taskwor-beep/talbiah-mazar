import React from 'react';
import { Navigation, Facebook, Twitter, Instagram } from 'lucide-react';

export default function Footer({ onJoinAsDriver }) {
  return (
    <footer className="bg-gray-900 text-gray-300 py-16">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-gradient-to-br from-red-600 to-orange-500 p-2 rounded-xl text-white">
              <Navigation size={24} />
            </div>
            <span className="text-2xl font-black text-white">مزار</span>
          </div>
          <p className="text-gray-400 leading-relaxed max-w-sm mb-6">
            تطبيقك الأمثل للتنقل في البقاع المقدسة بأمان وراحة تامة. نحرص على تقديم أفضل خدمة لضيوف الرحمن مع دعم كامل للدفع المحلي بالدينار الجزائري.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-orange-500 hover:text-white transition"><Facebook size={20}/></a>
            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-orange-500 hover:text-white transition"><Twitter size={20}/></a>
            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-orange-500 hover:text-white transition"><Instagram size={20}/></a>
          </div>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-6 text-lg">روابط سريعة</h4>
          <ul className="space-y-4">
            <li><a href="#" className="hover:text-orange-500 transition">عن مزار</a></li>
            {onJoinAsDriver && <li><a href="#" onClick={(e) => { e.preventDefault(); onJoinAsDriver(); }} className="hover:text-orange-500 transition">انضم كسائق</a></li>}
            <li><a href="#" className="hover:text-orange-500 transition">تصفح المزارات</a></li>
            <li><a href="#" className="hover:text-orange-500 transition">الأسئلة الشائعة</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-6 text-lg">قانوني</h4>
          <ul className="space-y-4">
            <li><a href="#" className="hover:text-orange-500 transition">شروط الاستخدام</a></li>
            <li><a href="#" className="hover:text-orange-500 transition">سياسة الخصوصية</a></li>
            <li><a href="#" className="hover:text-orange-500 transition">تراخيص النقل</a></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-sm text-gray-500">جميع الحقوق محفوظة © مزار {new Date().getFullYear()}</p>
        <div className="flex items-center gap-2 text-sm text-gray-500">
           الدفع الآمن مدعوم بواسطة <span className="font-bold text-white">Chargily</span>
        </div>
      </div>
    </footer>
  );
}
