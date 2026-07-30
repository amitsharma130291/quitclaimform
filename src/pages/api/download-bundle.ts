import type { APIRoute } from 'astro';
import { generateQuitclaimDeed, generateReceiptPDF } from '../../lib/pdf';

const DODO_API_KEY = import.meta.env.DODO_API_KEY;
const DODO_API_BASE = 'https://test.dodopayments.com';

// Verify payment is actually paid by checking it with Dodo API
async function verifyPayment(paymentId: string): Promise<{
  paid: boolean;
  customerEmail: string;
}> {
  if (!DODO_API_KEY || !paymentId) {
    return { paid: false, customerEmail: '' };
  }

  try {
    const resp = await fetch(`${DODO_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
      headers: {
        'Authorization': `Bearer ${DODO_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!resp.ok) {
      console.error('[download-bundle] Dodo payment lookup failed:', resp.status);
      return { paid: false, customerEmail: '' };
    }

    const data = await resp.json();

    // Payment statuses from Dodo: succeeded, failed, processing, pending
    const paid = data.status === 'succeeded' || data.payment_status === 'succeeded';
    const customerEmail = data.customer?.email ?? data.metadata?.customer_email ?? '';

    return { paid, customerEmail };
  } catch (err) {
    console.error('[download-bundle] payment verification error:', err);
    return { paid: false, customerEmail: '' };
  }
}

export const GET: APIRoute = async ({ request, cookies }) => {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get('payment_id') ?? url.searchParams.get('session_id') ?? '';

  if (!paymentId) {
    return new Response('Missing payment_id parameter', { status: 400 });
  }

  // Verify the payment is actually paid
  const { paid } = await verifyPayment(paymentId);

  if (!paid) {
    return new Response(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Payment Not Found — WhatIsAQuitclaimDeed.com</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 60px auto; padding: 0 20px; color: #1a1a1a; }
    h1 { font-size: 1.5rem; color: #dc2626; }
    a { color: #d97706; }
  </style>
</head>
<body>
  <h1>Payment not verified</h1>
  <p>We could not confirm a completed payment for this download link.</p>
  <p>If you believe this is an error, please <a href="/contact">contact us</a> with your payment reference number and we'll sort it out promptly.</p>
  <p><a href="/pricing">Return to pricing</a></p>
</body>
</html>`,
      { status: 403, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Read the deed data the user entered in the form (stored as a cookie by create-checkout.ts)
  const deedDataCookie = cookies.get('deed_data');
  let pdfBuffer: Buffer;
  let filename: string;

  if (deedDataCookie?.value) {
    try {
      const raw = JSON.parse(deedDataCookie.value) as Record<string, string>;

      // Map form field names to DeedData, applying sensible defaults for blanks
      const deedData = {
        grantorName:      raw.grantorName?.trim()      || '____________________________',
        granteeName:      raw.granteeName?.trim()       || '____________________________',
        propertyAddress:  raw.propertyAddress?.trim()   || '____________________________',
        legalDescription: raw.legalDescription?.trim()  || '[Copy this exactly from your existing deed or title report]',
        consideration:    raw.consideration?.trim()      || 'Ten Dollars ($10.00) and other good and valuable consideration',
        state:            raw.state?.trim()              || 'YOUR STATE',
        county:           raw.county?.trim()             || undefined,
        grantorAddress:   raw.grantorAddress?.trim()     || undefined,
        granteeAddress:   raw.granteeAddress?.trim()     || undefined,
      };

      pdfBuffer = await generateQuitclaimDeed(deedData);

      const stateSlug = deedData.state.toLowerCase().replace(/\s+/g, '-');
      filename = `quitclaim-deed-${stateSlug}.pdf`;
    } catch (err) {
      console.error('[download-bundle] Failed to parse deed_data cookie:', err);
      // Fall through to receipt fallback
      pdfBuffer = await generateReceiptPDF(paymentId);
      filename = 'deed-receipt.pdf';
    }
  } else {
    // Cookie has expired or user opened the link from a different browser/device.
    // Generate a support receipt rather than crashing.
    console.warn('[download-bundle] deed_data cookie missing for payment:', paymentId);
    pdfBuffer = await generateReceiptPDF(paymentId);
    filename = 'deed-receipt.pdf';
  }

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
};
