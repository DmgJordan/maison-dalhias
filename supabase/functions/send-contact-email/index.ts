import { createClient } from "npm:@supabase/supabase-js@2.39.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { name, email, phone = '', subject, message } = await req.json();

    // Validate required fields
    if (!name || !email || !subject || !message) {
      throw new Error('Les champs nom, email, sujet et message sont requis');
    }

    // Ensure phone is never null
    const sanitizedPhone = phone?.trim() || '';

    // Store in database first
    const { error: dbError } = await supabase
      .from('contact_forms')
      .insert([
        {
          name,
          email,
          phone: sanitizedPhone,
          subject,
          message,
          status: 'sent'
        }
      ]);

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Erreur lors de l\'enregistrement du message');
    }

    // Try to send email only if database insertion was successful
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.warn('Resend API key not configured');
      // Return success even if email sending is not configured
      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    const senderEmail = Deno.env.get('SENDER_EMAIL');

    // Prepare email content
    const emailContent = `
      Nouveau message de contact:
      
      Nom: ${name}
      Email: ${email}
      Téléphone: ${sanitizedPhone || 'Non renseigné'}
      Sujet: ${subject}
      
      Message:
      ${message}
    `;

    // Try to send email, but don't fail if it doesn't work
    try {
      if (resendApiKey.startsWith('re_')) {
        const emailData = {
          from: senderEmail,
          to: "dominguez-juan@orange.fr",
          subject: `[Contact Site] ${subject}`,
          text: emailContent,
        };

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailData),
        });

        if (!emailRes.ok) {
          console.error('Email sending failed:', await emailRes.text());
        }
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't throw here, we still want to return success since the message was saved
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error('Error in send-contact-email function:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Une erreur est survenue. Veuillez nous contacter par téléphone.',
        details: error.toString()
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});
