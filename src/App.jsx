import React, { useState } from 'react';
import { Package, MapPin, Clock, ChevronLeft, Star, Phone, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('active');

  const orders = [
    {
      id: '#ORD-9021',
      status: 'active',
      customer: 'أحمد محمد',
      pickup: 'مطعم البيك، حي العزيزية',
      dropoff: 'فندق أبراج الكسوة، البرج الرابع',
      price: '25',
      time: '15 دقيقة',
      driver: { name: 'عمر', rating: 4.8 },
      color: 'border-orange-500',
      bg: 'bg-orange-50'
    },
    {
      id: '#ORD-9022',
      status: 'active',
      customer: 'سارة عبدالله',
      pickup: 'صيدلية النهدي، شارع المنصور',
      dropoff: 'فندق سويس أوتيل، المقام',
      price: '15',
      time: '5 دقائق',
      driver: { name: 'يوسف', rating: 4.9 },
      color: 'border-red-500',
      bg: 'bg-red-50'
    },
    {
      id: '#ORD-8801',
      status: 'completed',
      customer: 'خالد عبدالعزيز',
      pickup: 'سوبر ماركت بن داود',
      dropoff: 'فندق فيرمونت، برج الساعة',
      price: '35',
      time: 'تم التوصيل',
      driver: { name: 'ماجد', rating: 5.0 },
      color: 'border-green-500',
      bg: 'bg-green-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 font-sans p-4 md:p-8">
      <div className="max-w-md mx-auto bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-white/40">
        
        {/* Header */}
        <header className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 p-6 text-white rounded-b-3xl shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">مزار للتوصيل</h1>
              <p className="text-orange-100 text-sm opacity-90">أسرع خدمة توصيل في المشاعر</p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
              <Package size={28} className="text-white" />
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex bg-black/10 rounded-xl p-1">
            <button 
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'active' ? 'bg-white text-orange-600 shadow' : 'text-white/80 hover:text-white'}`}
            >
              الطلبات الحالية
            </button>
            <button 
              onClick={() => setActiveTab('completed')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'completed' ? 'bg-white text-orange-600 shadow' : 'text-white/80 hover:text-white'}`}
            >
              الطلبات المكتملة
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-5 space-y-4">
          {orders.filter(o => o.status === activeTab).map((order) => (
            <div key={order.id} className={`p-4 rounded-2xl border-2 ${order.color} ${order.bg} bg-opacity-40 transition-transform hover:scale-[1.02] cursor-pointer`}>
              <div className="flex justify-between items-start mb-3">
                <span className="font-bold text-gray-800">{order.id}</span>
                <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600">
                  {order.price} ريال
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-gray-600 text-sm">
                  <div className="w-6 flex justify-center"><div className="w-2 h-2 rounded-full bg-orange-400"></div></div>
                  <span className="truncate">{order.pickup}</span>
                </div>
                <div className="flex items-center text-gray-600 text-sm">
                  <div className="w-6 flex justify-center"><MapPin size={14} className="text-red-500" /></div>
                  <span className="truncate">{order.dropoff}</span>
                </div>
              </div>

              <hr className="border-gray-200/60 mb-3" />

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                    {order.driver.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{order.driver.name}</p>
                    <div className="flex items-center text-[10px] text-gray-500">
                      <Star size={10} className="text-yellow-500 mr-1 fill-yellow-500" />
                      {order.driver.rating}
                    </div>
                  </div>
                </div>

                {order.status === 'active' ? (
                   <div className="flex gap-2">
                     <button className="bg-white p-2 rounded-full shadow-sm text-gray-600 hover:text-orange-500 transition-colors">
                       <Phone size={16} />
                     </button>
                     <button className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all">
                       تتبع الطلب
                     </button>
                   </div>
                ) : (
                  <div className="flex items-center text-green-600 text-xs font-bold bg-green-100 px-3 py-1.5 rounded-full">
                    <CheckCircle2 size={14} className="ml-1" /> مكتمل
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {orders.filter(o => o.status === activeTab).length === 0 && (
            <div className="text-center py-10 text-gray-400">
              لا توجد طلبات في هذا القسم
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
