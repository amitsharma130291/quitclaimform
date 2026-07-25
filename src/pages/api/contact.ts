import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Name, email, and message are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const web3FormsKey = import.meta.env.WEB3FORMS_KEY;

    const payload = {
      access_key: web3FormsKey,
      name,
      email,
      subject: subject || 'Contact Form Submission — WhatIsAQuitclaimDeed.com',
      message,
      to: 'amitsharma00261@gmail.com',
      from_name: 'WhatIsAQuitclaimDeed.com Contact Form',
    };

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.success) {
      return new Response(
        JSON.stringify({ success: true, message: 'Your message has been sent successfully.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: result.message || 'Failed to send message.' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    console.error('[contact api]', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
