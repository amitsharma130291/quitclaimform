import type { APIRoute } from 'astro';

const DODO_CHECKOUT_URL =
  'https://test.checkout.dodopayments.com/buy/pdt_0NkKQblWGog04bAoEmerv';
const SUCCESS_URL = 'https://whatisaquitclaimdeed.com/payment/success';

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: Record<string, string> = {};

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    body = await request.json().catch(() => ({}));
  } else {
    const formData = await request.formData().catch(() => new FormData());
    formData.forEach((value, key) => {
      body[key] = String(value);
    });
  }

  // Persist deed data in a short-lived cookie so /payment/success can retrieve it
  cookies.set('deed_data', JSON.stringify(body), {
    path: '/',
    maxAge: 60 * 60, // 1 hour — long enough to complete checkout
    httpOnly: true,
    sameSite: 'lax',
  });

  const checkoutUrl = `${DODO_CHECKOUT_URL}?quantity=1&redirect_url=${encodeURIComponent(SUCCESS_URL)}`;

  return new Response(JSON.stringify({ checkoutUrl }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
