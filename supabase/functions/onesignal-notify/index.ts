import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Zero-Trust Secure Backend Notification Dispatcher (FCM v1 / OneSignal v2)
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      title, 
      message, 
      targetRole = null, 
      targetUserId = null, 
      targetUrl = '/',
      data = {}
    } = await req.json();

    // 1. Strict Key Separation: Read credentials securely from backend secrets
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID') || 'a6871e60-16a7-424e-a111-f6a2ee2a5f78';
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY') || '';

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY is not configured.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 2. Build Zero-Trust High Priority Notification Payload
    const payload: Record<string, any> = {
      app_id: ONESIGNAL_APP_ID,
      headings: {
        ar: title || 'مزار - إشعار جديد 🚗',
        en: title || 'Mazar Notification'
      },
      contents: {
        ar: message || 'لديك إشعار جديد في تطبيق مزار',
        en: message || 'You have a new update in Mazar App'
      },
      url: targetUrl,
      data: data,
      // Principle 3: Match Android 8.0+ / 13+ Notification Channel with IMPORTANCE_HIGH
      android_channel_id: 'default_notification_channel',
      // Principle 4: Highest priority delivery for killed/background states (FCM High Priority)
      priority: 10,
      android_accent_color: 'FFE65100', // Premium Orange Mazar brand color
      android_visibility: 1, // Public visibility on lockscreen
      small_icon: 'ic_stat_onesignal_default'
    };

    // Principle 4: Target by external_id (UUID) whenever available, avoid temporary player_id
    if (targetUserId) {
      payload.include_aliases = {
        external_id: [targetUserId]
      };
      payload.target_channel = "push";
    } else if (targetRole) {
      payload.filters = [
        { field: 'tag', key: 'role', relation: '=', value: targetRole }
      ];
    } else {
      payload.included_segments = ['Total Subscriptions'];
    }

    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${ONESIGNAL_REST_API_KEY.startsWith('os_v2_app_') ? ONESIGNAL_REST_API_KEY : ONESIGNAL_REST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await res.json();
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
