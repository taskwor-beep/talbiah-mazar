# دليل ربط إشعارات الهاتف عبر OneSignal (Web Push)

تتيح خدمة **OneSignal** (المجانية بالكامل) إرسال إشعارات لشريط هاتف السائق أو المعتمر **حتى بعد إغلاق التطبيق تماماً وقفل الشاشة**.

لقد قمنا بتجهيز كافة الأكواد البرمجية والـ Service Worker مسبقاً، وما يتبقى عليك هو فقط نسخ مفاتيح حسابك المجاني في OneSignal.

---

### الخطوة 1: إنشاء حساب مجاني في OneSignal
1. ادخل إلى الموقع الرسمي: [https://onesignal.com](https://onesignal.com) وسجل حساباً مجانياً (Sign Up Free).
2. اضغط على زر **New App/Platform** لإنشاء تطبيق جديد.
3. اكتب اسم التطبيق: `مزار` أو `Mazar`.
4. اختر المنصة: **Web Push** ثم اضغط **Next: Configure Your Platform**.

---

### الخطوة 2: إعداد الـ Web Push
1. في خيار **Choose Integration**: اختر **Typical Site**.
2. في خانة **Site Name**: اكتب `مزار للتوصيل`.
3. في خانة **Site URL**:
   - ضع رابط موقعك (مثال: `https://your-domain.vercel.app` أو `http://localhost:3000` للتجربة المحلية).
4. في خانة **Auto Resubscribe**: فعّلها (Recommended).
5. اضغط **Save** في أسفل الصفحة.

---

### الخطوة 3: نسخ الـ App ID والـ Rest API Key
1. بعد حفظ الإعدادات، ادخل إلى صفحة **Settings** > **Keys & IDs** داخل OneSignal:
   - ستجد: **OneSignal App ID** (مثال: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
   - ستجد: **REST API Key** (مفتاح سري خاص بالسيرفر).

---

### الخطوة 4: وضع المفاتيح في مشروعك
1. **في الواجهة الأمامية (المتصفح):**
   - افتح ملف `.env` في المشروع وأضف السطر التالي:
     ```env
     VITE_ONESIGNAL_APP_ID="ضع_هنا_الـ_App_ID"
     ```
   - (أو في لوحة Vercel في Environment Variables).

2. **في الدوال السحابية (Supabase Secrets) للإرسال التلقائي:**
   - نفذ هذا الأمر في الـ Terminal:
     ```bash
     supabase secrets set ONESIGNAL_APP_ID="ضع_هنا_الـ_App_ID"
     supabase secrets set ONESIGNAL_REST_API_KEY="ضع_هنا_الـ_REST_API_Key"
     supabase functions deploy onesignal-notify --no-verify-jwt
     ```

---

### النتيجة بعد هذه الخطوات:
- عند دخول السائق أو المعتمر لأول مرة، يطلب المتصفح الإذن: **"هل ترغب بالسماح باستقبال الإشعارات؟"**
- بمجرد الضغط على **السماح (Allow)**، يتم تسجيل جهازه لدى OneSignal.
- عند حدوث أي طلب جديد، يصل الإشعار إلى شاشة الهاتف الأصلية برنين واهتزاز حتى لو كان تطبيق مزار مقفلاً تماماً!
