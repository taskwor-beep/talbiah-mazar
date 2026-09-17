import React from 'react';

// Example Usage:
// <OfferCard offer={offerData} onBook={() => handleBooking(offerData.id)} />

const OfferCard = ({ offer, onBook }) => {
  // offer object structure expected:
  // {
  //   id: string,
  //   price_total: number,
  //   route: { title: string, cover_image_url: string },
  //   transporter: { full_name: string, rating: number }
  // }

  return (
    <div className="flex flex-col bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 font-['Tajawal'] hover:shadow-lg transition-shadow duration-300 max-w-sm w-full">
      
      {/* Destination Image - Focus on the Route/Landmark */}
      <div className="relative h-48 w-full overflow-hidden">
        <img 
          src={offer?.route?.cover_image_url || '/default-landmark.jpg'} 
          alt={offer?.route?.title || 'Destination'} 
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
        
        {/* Badge: Full Payment Online */}
        <div className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm bg-opacity-90">
          الدفع كامل أونلاين
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex flex-col gap-4">
        
        {/* Route Title */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 leading-tight">
            {offer?.route?.title || 'مسار الرحلة'}
          </h3>
          
          {/* Transporter Info */}
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>الناقل: {offer?.transporter?.full_name || 'غير معروف'}</span>
            {offer?.transporter?.rating && (
              <span className="flex items-center text-amber-500 text-xs mr-auto bg-amber-50 px-2 py-0.5 rounded">
                ⭐ {offer.transporter.rating}
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100"></div>

        {/* Price and Action */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">التكلفة الإجمالية</span>
            <div className="text-2xl font-black text-emerald-600">
              {offer?.price_total || 0} <span className="text-sm font-medium">DZD</span>
            </div>
          </div>
          
          <button 
            onClick={onBook}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors duration-200 focus:ring-4 focus:ring-emerald-100"
          >
            احجز الآن
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default OfferCard;
