import type { APIRoute } from 'astro';

const DODO_API_KEY = import.meta.env.DODO_API_KEY;
const DODO_API_BASE = 'https://live.dodopayments.com';
const PRODUCT_ID = 'pdt_0NkKuPP0nyEim72rbfblJ';
const SITE_URL = 'https://whatisaquitclaimdeed.com';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, state, county } = body ?? {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'A valid email address is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!DODO_API_KEY) {
      console.error('[create-checkout] DODO_API_KEY is not set');
      return new Response(
        JSON.stringify({ error: 'Payment provider is not configured.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // /checkouts expects CustomerRequest = NewCustomer | AttachExistingCustomer.
    // NewCustomer shape is FLAT: { email, name? }
    // The old nested shape { create_new_customer: { email, name } } is a /payments
    // endpoint pattern and is rejected by the live /checkouts API.
    const dodoPayload = {
      product_cart: [
        {
          product_id: PRODUCT_ID,
          quantity: 1,
        },
      ],
      customer: {
        email: email.trim().toLowerCase(),
      },
      return_url: `${SITE_URL}/payment/success`,
      cancel_url: `${SITE_URL}/payment/failed`,
      metadata: {
        customer_email: email.trim().toLowerCase(),
        state: state ?? '',
        county: county ?? '',
      },
    };

    const dodoRes = await fetch(`${DODO_API_BASE}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DODO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dodoPayload),
    });

    if (!dodoRes.ok) {
      const errBody = await dodoRes.text();
      console.error('[create-checkout] Dodo API error:', dodoRes.status, errBody);
      return new Response(
        JSON.stringify({ error: 'Checkout creation failed', detail: errBody }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await dodoRes.json();

    if (!data.checkout_url) {
      console.error('[create-checkout] No checkout_url in Dodo response:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'Payment provider returned an invalid response.' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        checkoutUrl: data.checkout_url,
        sessionId: data.session_id ?? null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[create-checkout] unexpected error:', err);
    return new Response(
      JSON.stringify({ error: `Unexpected error: ${msg}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
