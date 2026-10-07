// قاعدة بيانات الأماكن والمزارات المعتمدة في مكة المكرمة والمدينة المنورة
export const DESTINATIONS_DB = [
  // ================= مكة المكرمة =================
  {
    id: 'makkah_haram',
    name: 'المسجد الحرام (الكعبة المشرفة)',
    city: 'makkah',
    category: 'mosque',
    categoryName: 'مساجد مقدسة',
    lat: 21.4225,
    lng: 39.8262,
    icon: '🕋'
  },
  {
    id: 'makkah_hira',
    name: 'غار حراء (جبل النور)',
    city: 'makkah',
    category: 'historical',
    categoryName: 'مزارات تاريخية',
    lat: 21.4578,
    lng: 39.8592,
    icon: '⛰️'
  },
  {
    id: 'makkah_thawr',
    name: 'غار ثور (جبل ثور)',
    city: 'makkah',
    category: 'historical',
    categoryName: 'مزارات تاريخية',
    lat: 21.3783,
    lng: 39.8504,
    icon: '⛰️'
  },
  {
    id: 'makkah_taneem',
    name: 'مسجد السيدة عائشة (التنعيم)',
    city: 'makkah',
    category: 'mosque',
    categoryName: 'مساجد مقدسة',
    lat: 21.4647,
    lng: 39.7892,
    icon: '🕌'
  },
  {
    id: 'makkah_mina',
    name: 'مشعر منى (موقع الجمرات)',
    city: 'makkah',
    category: 'holy_sites',
    categoryName: 'مشاعر مقدسة',
    lat: 21.4133,
    lng: 39.8933,
    icon: '⛺'
  },
  {
    id: 'makkah_muzdalifah',
    name: 'مشعر مزدلفة',
    city: 'makkah',
    category: 'holy_sites',
    categoryName: 'مشاعر مقدسة',
    lat: 21.3811,
    lng: 39.9242,
    icon: '⛺'
  },
  {
    id: 'makkah_arafat',
    name: 'مشعر عرفات (جبل الرحمة)',
    city: 'makkah',
    category: 'holy_sites',
    categoryName: 'مشاعر مقدسة',
    lat: 21.3547,
    lng: 39.9842,
    icon: '⛰️'
  },
  {
    id: 'makkah_namirah',
    name: 'مسجد نمرة (عرفات)',
    city: 'makkah',
    category: 'mosque',
    categoryName: 'مساجد مقدسة',
    lat: 21.3619,
    lng: 39.9658,
    icon: '🕌'
  },
  {
    id: 'makkah_khaif',
    name: 'مسجد الخيف (منى)',
    city: 'makkah',
    category: 'mosque',
    categoryName: 'مساجد مقدسة',
    lat: 21.4172,
    lng: 39.8789,
    icon: '🕌'
  },
  {
    id: 'makkah_malaa',
    name: 'مقبرة المعلاة التاريخية',
    city: 'makkah',
    category: 'historical',
    categoryName: 'مزارات تاريخية',
    lat: 21.4361,
    lng: 39.8317,
    icon: '🏛️'
  },
  {
    id: 'makkah_train',
    name: 'محطة قطار الحرمين السريع (مكة - الرصيفة)',
    city: 'makkah',
    category: 'station',
    categoryName: 'محطات ومطارات',
    lat: 21.4312,
    lng: 39.8011,
    icon: '🚄'
  },
  {
    id: 'makkah_clock_tower',
    name: 'أبراج البيت (برج الساعة / وقف الملك عبدالعزيز)',
    city: 'makkah',
    category: 'hotel',
    categoryName: 'فنادق ومعالم',
    lat: 21.4189,
    lng: 39.8260,
    icon: '🏨'
  },
  {
    id: 'makkah_kiswah_hotel',
    name: 'فندق أبراج الكسوة (التيسير)',
    city: 'makkah',
    category: 'hotel',
    categoryName: 'فنادق ومعالم',
    lat: 21.4339,
    lng: 39.8139,
    icon: '🏨'
  },
  {
    id: 'makkah_jabal_omar',
    name: 'فنادق جبل عمر (كونراد / هيلتون)',
    city: 'makkah',
    category: 'hotel',
    categoryName: 'فنادق ومعالم',
    lat: 21.4206,
    lng: 39.8211,
    icon: '🏨'
  },
  {
    id: 'makkah_dar_altawhid',
    name: 'فندق دار التوحيد إنتركونتيننتال',
    city: 'makkah',
    category: 'hotel',
    categoryName: 'فنادق ومعالم',
    lat: 21.4233,
    lng: 39.8239,
    icon: '🏨'
  },
  {
    id: 'makkah_aziziya',
    name: 'حي العزيزية (مكة)',
    city: 'makkah',
    category: 'district',
    categoryName: 'أحياء ومراكز',
    lat: 21.3986,
    lng: 39.8658,
    icon: '📍'
  },

  // ================= المدينة المنورة =================
  {
    id: 'madinah_prophet_mosque',
    name: 'المسجد النبوي الشريف',
    city: 'madinah',
    category: 'mosque',
    categoryName: 'مساجد مقدسة',
    lat: 24.4672,
    lng: 39.6111,
    icon: '🕌'
  },
  {
    id: 'madinah_quba',
    name: 'مسجد قباء',
    city: 'madinah',
    category: 'mosque',
    categoryName: 'مساجد مقدسة',
    lat: 24.4394,
    lng: 39.6172,
    icon: '🕌'
  },
  {
    id: 'madinah_qiblatain',
    name: 'مسجد القبلتين',
    city: 'madinah',
    category: 'mosque',
    categoryName: 'مساجد مقدسة',
    lat: 24.4842,
    lng: 39.5786,
    icon: '🕌'
  },
  {
    id: 'madinah_uhud',
    name: 'جبل أحد ومقبرة شهداء أحد (جبل الرماة)',
    city: 'madinah',
    category: 'historical',
    categoryName: 'مزارات تاريخية',
    lat: 24.5033,
    lng: 39.6128,
    icon: '⛰️'
  },
  {
    id: 'madinah_baqi',
    name: 'مقبرة البقيع (بقيع الغرقد)',
    city: 'madinah',
    category: 'historical',
    categoryName: 'مزارات تاريخية',
    lat: 24.4667,
    lng: 39.6156,
    icon: '🏛️'
  },
  {
    id: 'madinah_miqat',
    name: 'مسجد الميقات (ذي الحليفة / آبار علي)',
    city: 'madinah',
    category: 'mosque',
    categoryName: 'مساجد مقدسة',
    lat: 24.4131,
    lng: 39.5431,
    icon: '🕌'
  },
  {
    id: 'madinah_ghamama',
    name: 'مسجد الغمامة',
    city: 'madinah',
    category: 'mosque',
    categoryName: 'مساجد مقدسة',
    lat: 24.4656,
    lng: 39.6069,
    icon: '🕌'
  },
  {
    id: 'madinah_khandaq',
    name: 'المساجد السبعة (موقع غزوة الخندق)',
    city: 'madinah',
    category: 'historical',
    categoryName: 'مزارات تاريخية',
    lat: 24.4758,
    lng: 39.5936,
    icon: '🏛️'
  },
  {
    id: 'madinah_ghars_well',
    name: 'بئر غرس التاريخية',
    city: 'madinah',
    category: 'historical',
    categoryName: 'مزارات تاريخية',
    lat: 24.4489,
    lng: 39.6267,
    icon: '💧'
  },
  {
    id: 'madinah_othman_well',
    name: 'بئر عثمان بن عفان (بئر رومة)',
    city: 'madinah',
    category: 'historical',
    categoryName: 'مزارات تاريخية',
    lat: 24.4981,
    lng: 39.5769,
    icon: '💧'
  },
  {
    id: 'madinah_train',
    name: 'محطة قطار الحرمين السريع (المدينة المنورة)',
    city: 'madinah',
    category: 'station',
    categoryName: 'محطات ومطارات',
    lat: 24.4789,
    lng: 39.6706,
    icon: '🚄'
  },
  {
    id: 'madinah_airport',
    name: 'مطار الأمير محمد بن عبدالعزيز الدولي',
    city: 'madinah',
    category: 'station',
    categoryName: 'محطات ومطارات',
    lat: 24.5539,
    lng: 39.7050,
    icon: '✈️'
  },
  {
    id: 'madinah_dar_altaqwa',
    name: 'فندق دار التقوى (المدينة)',
    city: 'madinah',
    category: 'hotel',
    categoryName: 'فنادق ومعالم',
    lat: 24.4700,
    lng: 39.6117,
    icon: '🏨'
  },
  {
    id: 'madinah_oberoi',
    name: 'فندق أوبروي المدينة',
    city: 'madinah',
    category: 'hotel',
    categoryName: 'فنادق ومعالم',
    lat: 24.4711,
    lng: 39.6106,
    icon: '🏨'
  },
  {
    id: 'madinah_quran_complex',
    name: 'مجمع الملك فهد لطباعة المصحف الشريف',
    city: 'madinah',
    category: 'historical',
    categoryName: 'مزارات تاريخية',
    lat: 24.5008,
    lng: 39.5392,
    icon: '📖'
  }
];
