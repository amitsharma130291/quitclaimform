import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

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

    const gmailAppPassword = import.meta.env.GMAIL_APP_PASSWORD;
    if (!gmailAppPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Contact form is not configured.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'amitsharma00261@gmail.com',
        pass: gmailAppPassword,
      },
    });

    await transporter.sendMail({
      from: `"WhatIsAQuitclaimDeed.com Contact Form" <amitsharma00261@gmail.com>`,
      to: 'amitsharma00261@gmail.com',
      replyTo: email,
      subject: subject || 'Contact Form Submission — WhatIsAQuitclaimDeed.com',
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<hr />
<p>${message.replace(/\n/g, '<br />')}</p>`,
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Your message has been sent successfully.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[contact api]', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
