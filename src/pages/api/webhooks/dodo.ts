import type { APIRoute } from 'astro';
import { createHmac, timingSafeEqual } from 'crypto';
import nodemailer from 'nodemailer';

const DODO_WEBHOOK_SECRET = import.meta.env.DODO_WEBHOOK_SECRET;
const GMAIL_USER = import.meta.env.GMAIL_USER || 'amitsharma00261@gmail.com';
const GMAIL_PASS = import.meta.env.GMAIL_APP_PASSWORD;
const SITE_URL = 'https://whatisaquitclaimdeed.com';
const OWNER_EMAIL = 'amitsharma00261@gmail.com';

// Standard Webhooks signature verification:
// signed_content = webhook-id + "." + webhook-timestamp + "." + raw_body
// signature     = base64(HMAC-SHA256(secret_bytes, signed_content))
function verifyWebhookSignature(
  rawBody: string,
  webhookId: string,
  webhookTimestamp: string,
  webhookSignature: string,
  secret: string
): boolean {
  try {
    // The secret from Dodo is base64-encoded
    const secretBytes = Buffer.from(secret.replace('whsec_', ''), 'base64');
    const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
    const computedHmac = createHmac('sha256', secretBytes)
      .update(signedContent)
      .digest('base64');

    // webhookSignature may contain multiple space-separated "v1,<sig>" entries
    const signatures = webhookSignature.split(' ');
    for (const sig of signatures) {
      const sigValue = sig.startsWith('v1,') ? sig.slice(3) : sig;
      try {
        const a = Buffer.from(computedHmac, 'base64');
        const b = Buffer.from(sigValue, 'base64');
        if (a.length === b.length && timingSafeEqual(a, b)) {
          return true;
        }
      } catch {
        // continue to next signature
      }
    }
    return false;
  } catch (err) {
    console.error('[dodo-webhook] signature verification error:', err);
    return false;
  }
}

function createTransporter() {
  if (!GMAIL_PASS) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });
}

async function sendCustomerSuccessEmail(
  toEmail: string,
  paymentId: string,
  metadata: Record<string, string>
) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('[dodo-webhook] GMAIL_APP_PASSWORD not set — skipping customer email');
    return;
  }

  const state = metadata.state || 'your state';
  const county = metadata.county || 'your county';
  const downloadUrl = `${SITE_URL}/api/download-bundle?payment_id=${encodeURIComponent(paymentId)}`;

  await transporter.sendMail({
    from: `"WhatIsAQuitclaimDeed.com" <${GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Complete Filing Bundle — Download Ready',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <h1 style="color:#1a1a1a;font-size:24px;margin-bottom:16px">Your bundle is ready to download</h1>
        <p style="font-size:16px;line-height:1.6">Thank you for your purchase! Your Complete Filing Bundle for <strong>${state}${county ? `, ${county} County` : ''}</strong> is ready.</p>
        <p style="font-size:16px;line-height:1.6">Your bundle includes:</p>
        <ul style="font-size:15px;line-height:1.8;color:#333">
          <li>County-specific recording checklist</li>
          <li>Legal description guide</li>
          <li>Post-signing step-by-step guide</li>
          <li>Transfer tax calculator</li>
          <li>90-day re-download access</li>
        </ul>
        <div style="margin:32px 0;text-align:center">
          <a href="${downloadUrl}" style="display:inline-block;background:#d97706;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:700">
            Download Your Filing Bundle
          </a>
        </div>
        <p style="font-size:14px;color:#666;margin-top:24px">
          This link will remain active for 90 days. Your payment reference: <code style="background:#f3f4f6;padding:2px 6px;border-radius:3px">${paymentId}</code>
        </p>
        <p style="font-size:14px;color:#666">Questions? Reply to this email or visit <a href="${SITE_URL}/contact" style="color:#d97706">whatisaquitclaimdeed.com/contact</a>.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="font-size:12px;color:#9ca3af">WhatIsAQuitclaimDeed.com — Your deed. Recorded right.</p>
      </div>
    `,
    text: `Your Complete Filing Bundle is ready!\n\nThank you for your purchase. Download your bundle here:\n${downloadUrl}\n\nThis link is active for 90 days. Payment ref: ${paymentId}\n\nQuestions? Contact us at ${SITE_URL}/contact`,
  });
}

async function sendOwnerNotificationEmail(
  subject: string,
  htmlContent: string,
  textContent: string
) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('[dodo-webhook] GMAIL_APP_PASSWORD not set — skipping owner notification');
    return;
  }
  await transporter.sendMail({
    from: `"WhatIsAQuitclaimDeed.com" <${GMAIL_USER}>`,
    to: OWNER_EMAIL,
    subject,
    html: htmlContent,
    text: textContent,
  });
}

export const POST: APIRoute = async ({ request }) => {
  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch (err) {
    return new Response('Bad request', { status: 400 });
  }

  const webhookId = request.headers.get('webhook-id') ?? '';
  const webhookTimestamp = request.headers.get('webhook-timestamp') ?? '';
  const webhookSignature = request.headers.get('webhook-signature') ?? '';

  // Verify signature if secret is configured
  if (DODO_WEBHOOK_SECRET) {
    const isValid = verifyWebhookSignature(
      rawBody,
      webhookId,
      webhookTimestamp,
      webhookSignature,
      DODO_WEBHOOK_SECRET
    );
    if (!isValid) {
      console.error('[dodo-webhook] Invalid signature');
      return new Response('Unauthorized', { status: 401 });
    }
  } else {
    console.warn('[dodo-webhook] DODO_WEBHOOK_SECRET not set — skipping signature verification');
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const eventType = payload.type as string | undefined;
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const metadata = (data.metadata ?? {}) as Record<string, string>;
  const timestamp = payload.timestamp as string ?? new Date().toISOString();

  console.log(`[dodo-webhook] Received event: ${eventType}`);

  try {
    if (eventType === 'payment.succeeded') {
      const paymentId = (data.payment_id ?? data.id ?? webhookId) as string;
      const customerEmail = (data.customer as Record<string, string> | undefined)?.email
        ?? metadata.customer_email
        ?? '';
      const amount = data.total_amount ?? data.amount;
      const currency = (data.currency as string | undefined)?.toUpperCase() ?? 'USD';

      // 1. Send download email to customer
      if (customerEmail) {
        await sendCustomerSuccessEmail(customerEmail, paymentId, metadata);
      }

      // 2. Notify owner
      await sendOwnerNotificationEmail(
        `[WhatIsAQuitclaimDeed.com] New payment — ${paymentId}`,
        `<div style="font-family:Arial,sans-serif;color:#1a1a1a">
          <h2>New payment received</h2>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Payment ID</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${paymentId}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Customer email</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${customerEmail || '(unknown)'}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>State</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${metadata.state || '(unknown)'}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>County</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${metadata.county || '(unknown)'}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Amount</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${amount ?? '?'} ${currency}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Timestamp</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${timestamp}</td></tr>
          </table>
        </div>`,
        `New payment received\nPayment ID: ${paymentId}\nCustomer: ${customerEmail}\nState: ${metadata.state}\nCounty: ${metadata.county}\nAmount: ${amount} ${currency}\nTimestamp: ${timestamp}`
      );
    } else if (eventType === 'payment.failed') {
      const paymentId = (data.payment_id ?? data.id ?? webhookId) as string;
      const customerEmail = (data.customer as Record<string, string> | undefined)?.email
        ?? metadata.customer_email
        ?? '(unknown)';
      const reason = data.error_code ?? data.failure_reason ?? 'unknown';

      // Only notify owner on failure — NOT the customer
      await sendOwnerNotificationEmail(
        `[WhatIsAQuitclaimDeed.com] Payment FAILED — ${paymentId}`,
        `<div style="font-family:Arial,sans-serif;color:#1a1a1a">
          <h2 style="color:#dc2626">Payment failed</h2>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Payment ID</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${paymentId}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Customer email</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${customerEmail}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Failure reason</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${reason}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>State</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${metadata.state || '(unknown)'}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Timestamp</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${timestamp}</td></tr>
          </table>
        </div>`,
        `Payment FAILED\nPayment ID: ${paymentId}\nCustomer: ${customerEmail}\nReason: ${reason}\nState: ${metadata.state}\nTimestamp: ${timestamp}`
      );
    } else {
      // Unhandled event — just acknowledge
      console.log(`[dodo-webhook] Unhandled event type: ${eventType}`);
    }
  } catch (err) {
    console.error('[dodo-webhook] error processing event:', err);
    // Still return 200 so Dodo does not retry indefinitely for email failures
    return new Response(JSON.stringify({ received: true, warning: 'Email send failed' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
