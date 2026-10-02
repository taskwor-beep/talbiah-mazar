import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { customer_name, pickup, dropoff } = await req.json();

    // 1. Init Supabase client to fetch settings
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Fetch whatsapp settings
    const { data: settingData, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'whatsapp_notify')
      .single();

    if (error || !settingData || !settingData.value?.is_active) {
      return new Response(JSON.stringify({ message: "WhatsApp notifications are disabled or not configured." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { api_key, phone, template } = settingData.value;

    if (!api_key || !phone) {
      return new Response(JSON.stringify({ error: "API Key or Phone is missing in settings." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 3. Prepare the message
    let message = template || "طلب جديد من {customer_name}! الانطلاق: {pickup}، الوجهة: {dropoff}";
    message = message.replace(/{customer_name}/g, customer_name || 'غير معروف')
                     .replace(/{pickup}/g, pickup || 'غير محدد')
                     .replace(/{dropoff}/g, dropoff || 'غير محدد');

    // 4. Send to CallMeBot API
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMessage}&apikey=${api_key}`;

    const response = await fetch(url);
    const responseText = await response.text();

    console.log("CallMeBot Response:", responseText);

    return new Response(JSON.stringify({ success: true, callmebot_response: responseText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
