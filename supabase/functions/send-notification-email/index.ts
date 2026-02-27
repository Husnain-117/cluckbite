import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RECIPIENT_EMAIL = "husnainakram525@gmail.com";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Received payload:', JSON.stringify(payload));
    
    const record = payload.record;

    if (!record) {
      console.error('No record in payload');
      return new Response(JSON.stringify({ error: 'No record found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, notification_type, recipient_role, order_id } = record;

    const subject = `🔔 Cluck Bite: New ${notification_type?.replace('_', ' ') || 'notification'} (${recipient_role})`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🐔 Cluck Bite Notification</h1>
        </div>
        <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 8px;"><strong>Panel:</strong> ${recipient_role?.charAt(0).toUpperCase() + recipient_role?.slice(1)}</p>
          <p style="font-size: 16px; color: #374151; margin-bottom: 8px;"><strong>Type:</strong> ${notification_type?.replace('_', ' ')?.toUpperCase() || 'GENERAL'}</p>
          ${order_id ? `<p style="font-size: 16px; color: #374151; margin-bottom: 8px;"><strong>Order ID:</strong> ${order_id}</p>` : ''}
          <div style="background: #f9fafb; border-left: 4px solid #f97316; padding: 16px; margin: 16px 0; border-radius: 4px;">
            <p style="font-size: 16px; color: #1f2937; margin: 0;">${message}</p>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">This is an automated notification from your Cluck Bite system.</p>
        </div>
      </div>
    `;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Sending email to:', RECIPIENT_EMAIL);
    
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Cluck Bite <onboarding@resend.dev>',
        to: [RECIPIENT_EMAIL],
        subject,
        html: htmlBody,
      }),
    });

    const emailData = await emailRes.json();
    
    if (!emailRes.ok) {
      console.error('Resend API error:', JSON.stringify(emailData));
      return new Response(JSON.stringify({ error: 'Email send failed', details: emailData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Email sent successfully:', JSON.stringify(emailData));

    return new Response(JSON.stringify({ success: true, emailId: emailData.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-notification-email:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
