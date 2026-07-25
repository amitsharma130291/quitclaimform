import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

export const POST: APIRoute = async ({ request }) => {
  try {
    const pageUrl = request.headers.get('referer') || 'https://whatisaquitclaimdeed.com/contact';
    const body = await request.json();
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Name, email, and message are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const gmailUser = import.meta.env.GMAIL_USER;
    const gmailPass = import.meta.env.GMAIL_APP_PASSWORD;

    if (!gmailPass) {
      console.error('[contact api] GMAIL_APP_PASSWORD is not set');
      return new Response(
        JSON.stringify({ success: false, error: 'Server email configuration is missing (GMAIL_APP_PASSWORD not set).' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: gmailUser || 'amitsharma00261@gmail.com',
        pass: gmailPass,
      },
    });

    // Verify SMTP connection before attempting to send
    try {
      await transporter.verify();
    } catch (verifyErr: unknown) {
      const errMsg = verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
      console.error('[contact api] SMTP verify failed:', verifyErr);
      return new Response(
        JSON.stringify({ success: false, error: `SMTP connection failed: ${errMsg}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await transporter.sendMail({
      from: `"WhatIsAQuitclaimDeed.com" <${gmailUser || 'amitsharma00261@gmail.com'}>`,
      to: 'amitsharma00261@gmail.com',
      replyTo: email,
      subject: `[WhatIsAQuitclaimDeed.com] Contact from ${name}`,
      text: `Site: WhatIsAQuitclaimDeed.com\nPage: ${pageUrl}\n\nName: ${name}\nEmail: ${email}\n\n${message}`,
      html: `<p><strong>Site:</strong> WhatIsAQuitclaimDeed.com</p><p><strong>Page:</strong> <a href="${pageUrl}">${pageUrl}</a></p><hr><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>`,
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Your message has been sent successfully.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[contact api] send error:', err);
    return new Response(
      JSON.stringify({ success: false, error: `Failed to send message: ${errMsg}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
