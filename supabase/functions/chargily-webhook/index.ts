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
       const metadata = event.data.metadata;
       
       if (metadata && metadata.order_id) {
         // Update the order status to paid (or completed/accepted depending on flow)
         const { error } = await supabase
           .from('orders')
           .update({ payment_status: 'paid' }) // You can add payment_status if it exists, or use status
           .eq('id', metadata.order_id);
           
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
