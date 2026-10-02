import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CHARGILY_SECRET = 'test_sk_uO50mXQkSCDsF35MGSzCuD0PJOlRhBhfsrQgFsCk';

serve(async (req) => {
  try {
    const signature = req.headers.get('signature');
    if (!signature) {
      return new Response('No signature provided', { status: 400 });
    }

    const payload = await req.text();
    
    // Verify signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(CHARGILY_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    
    // Convert hex signature to Uint8Array
    const signatureBytes = new Uint8Array(signature.match(/[\da-f]{2}/gi)?.map(h => parseInt(h, 16)) || []);
    
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(payload)
    );

    if (!isValid) {
      return new Response('Invalid signature', { status: 403 });
    }

    const event = JSON.parse(payload);

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle Chargily V2 Events
    if (event.type === 'checkout.paid') {
       // metadata is an array in Chargily V2 checkouts, but sometimes returned as object. Safely extract bookingId.
       let bookingId = null;
       if (Array.isArray(event.data.metadata)) {
         const metaObj = event.data.metadata.find((m: any) => m.booking_id);
         if (metaObj) bookingId = metaObj.booking_id;
       } else if (event.data.metadata?.booking_id) {
         bookingId = event.data.metadata.booking_id;
       }

       if (bookingId) {
         // Update the order status to accepted so the driver gets notified
         const { error } = await supabase
           .from('orders')
           .update({ status: 'accepted', payment_status: 'paid' }) 
           .eq('id', bookingId);
           
         if (error) {
            console.error('Error updating order:', error);
            return new Response('Failed to update order', { status: 500 });
         }
       }
    }

    return new Response('Webhook processed successfully', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(`Error processing webhook: ${error.message}`, { status: 500 });
  }
});
