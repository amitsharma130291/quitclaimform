import type { APIRoute } from 'astro';
import { stripe } from '../../lib/stripe';
import { generateQuitclaimDeed } from '../../lib/pdf';

export const GET: APIRoute = async ({ url }) => {
  const sessionId = url.searchParams.get('session_id');
  if (!sessionId) return new Response('Missing session_id', { status: 400 });

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid') {
    return new Response('Payment not complete', { status: 402 });
  }

  const meta = session.metadata || {};
  const pdf = await generateQuitclaimDeed({
    grantorName: meta.grantorName || '',
    granteeName: meta.granteeName || '',
    propertyAddress: meta.propertyAddress || '',
    legalDescription: meta.legalDesc || '',
    consideration: meta.consideration || '$10.00',
    state: meta.state || '',
  });

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="quitclaim-deed-${meta.state?.toLowerCase() || 'deed'}.pdf"`,
    },
  });
};
