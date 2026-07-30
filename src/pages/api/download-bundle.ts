import type { APIRoute } from 'astro';
import { generateQuitclaimDeed } from '../../lib/pdf';

const DODO_API_KEY = import.meta.env.DODO_API_KEY;
const DODO_API_BASE = 'https://api.dodopayments.com';

// Verify payment is actually paid by checking it with Dodo API
async function verifyPayment(paymentId: string): Promise<{
  paid: boolean;
  customerEmail: string;
  state: string;
  county: string;
}> {
  if (!DODO_API_KEY || !paymentId) {
    return { paid: false, customerEmail: '', state: '', county: '' };
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
      return { paid: false, customerEmail: '', state: '', county: '' };
    }

    const data = await resp.json();

    // Payment statuses from Dodo: succeeded, failed, processing, pending
    const paid = data.status === 'succeeded' || data.payment_status === 'succeeded';
    const metadata = data.metadata ?? {};
    const customerEmail = data.customer?.email ?? metadata.customer_email ?? '';
    const state = metadata.state ?? '';
    const county = metadata.county ?? '';

    return { paid, customerEmail, state, county };
  } catch (err) {
    console.error('[download-bundle] payment verification error:', err);
    return { paid: false, customerEmail: '', state: '', county: '' };
  }
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get('payment_id') ?? url.searchParams.get('session_id') ?? '';

  if (!paymentId) {
    return new Response('Missing payment_id parameter', { status: 400 });
  }

  // Verify the payment is actually paid
  const { paid, state, county } = await verifyPayment(paymentId);

  if (!paid) {
    // Return a friendly HTML page rather than a bare 403
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

  try {
    // Generate the filing bundle PDF using the existing PDF generator.
    // For the bundle we produce a detailed guide PDF.
    // The actual "bundle" content is the deed + guidance — we generate the deed
    // with placeholder fields that the customer fills in, plus standard instructions.
    const pdfBuffer = await generateQuitclaimDeed({
      grantorName: '____________________________',
      granteeName: '____________________________',
      propertyAddress: '____________________________',
      legalDescription: '[Copy this exactly from your existing deed or title report]',
      consideration: 'Ten Dollars ($10.00) and other good and valuable consideration',
      state: state || 'YOUR STATE',
      county: county || undefined,
    });

    const filename = `complete-filing-bundle-${state ? state.toLowerCase().replace(/\s+/g, '-') : 'quitclaim'}.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[download-bundle] PDF generation error:', err);
    return new Response(`PDF generation failed: ${msg}`, { status: 500 });
  }
};
