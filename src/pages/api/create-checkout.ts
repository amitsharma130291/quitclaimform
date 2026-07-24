import type { APIRoute } from 'astro';
import { stripe, DEED_PRICE_CENTS } from '../../lib/stripe';

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  const origin = request.headers.get('origin') || 'https://quitclaimform.com';

  // Stripe metadata limit: 500 chars per value
  // For large legal descriptions, truncate and store session ID for KV lookup
  const metadata: Record<string, string> = {
    grantorName: data.grantorName?.slice(0, 499) || '',
    granteeName: data.granteeName?.slice(0, 499) || '',
    propertyAddress: data.propertyAddress?.slice(0, 499) || '',
    consideration: data.consideration?.slice(0, 499) || '$10.00',
    state: data.state || '',
    legalDesc: data.legalDescription?.slice(0, 499) || '',
  };

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${data.state || 'State'} Quitclaim Deed`,
          description: 'State-compliant quitclaim deed PDF — instant download after payment',
        },
        unit_amount: DEED_PRICE_CENTS,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${origin}/download?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/quitclaim-deed-form/`,
    metadata,
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
