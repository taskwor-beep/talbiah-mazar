# دليل النشر والتفعيل السحابي لمنصة مزار (Mazar Deployment Guide)

يوضح هذا الدليل الخطوات البسيطة لتفعيل كافة الخدمات السحابية الخاصة بالمنصة على **Supabase** و **Chargily**.

---

### 1. نشر الدوال السحابية (Supabase Edge Functions)
من خلال سطر الأوامر (Terminal / CLI) في المجلد الرئيسي للمشروع، نفذ الأوامر التالية لنشر الدوال:

```bash
# 1. دالة إنشاء جلسة الدفع (Chargily Checkout)
supabase functions deploy chargily-checkout --no-verify-jwt

# 2. دالة استقبال وتأكيد الدفع المشفر (Chargily Webhook)
supabase functions deploy chargily-webhook --no-verify-jwt

# 3. دالة إشعارات واتساب الفورية (WhatsApp CallMeBot)
supabase functions deploy whatsapp-notify --no-verify-jwt
```

---

### 2. ضبط المفاتيح السرية (Supabase Secrets)
قم بتعيين المتغيرات السرية على Supabase عبر الأمر التالي (أو من خلال لوحة تحكم Supabase > Project Settings > Edge Functions > Secrets):

```bash
supabase secrets set CHARGILY_SECRET_KEY="test_sk_uO50mXQkSCDsF35MGSzCuD0PJOlRhBhfsrQgFsCk"
supabase secrets set SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
```

> **ملاحظة للإنتاج (Production):** عند إطلاق المنصة للجمهور الفعلي، استبدل مفتاح `CHARGILY_SECRET_KEY` بالمفتاح الحي (`live_sk_...`) المستخرج من حسابك في Chargily.

---

### 3. ربط الـ Webhook في بوابة Chargily Pay
1. ادخل إلى حسابك في لوحة تحكم Chargily: [Chargily Pay Dashboard](https://pay.chargily.net)
2. توجه إلى **Developers** > **Webhooks**.
3. أضف رابط الويب هوك التالي:
   ```
   https://YOUR_PROJECT_ID.supabase.co/functions/v1/chargily-webhook
   ```
4. حدد الأحداث: `checkout.paid` و `checkout.failed`.

---

### 4. تطبيق سياسات الحماية والأمان (RLS)
1. ادخل إلى لوحة تحكم Supabase > **SQL Editor**.
2. افتح الملف `supabase_rls_security.sql` المرفق في المشروع وانسخ محتواه.
3. اضغط **Run** لتفعيل حماية الجداول وفهارس الأداء السريعة.
