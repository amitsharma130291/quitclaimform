import type { APIRoute } from 'astro';
import { generateQuitclaimDeed } from '../../lib/pdf';

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();

  const required = ['grantorName', 'granteeName', 'propertyAddress', 'legalDescription', 'state'];
  for (const field of required) {
    if (!data[field]) {
      return new Response(JSON.stringify({ error: `Missing required field: ${field}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const pdf = await generateQuitclaimDeed({
    grantorName: data.grantorName,
    granteeName: data.granteeName,
    propertyAddress: data.propertyAddress,
    legalDescription: data.legalDescription,
    consideration: data.consideration || 'Ten Dollars ($10.00) and other good and valuable consideration',
    state: data.state,
  });

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="quitclaim-deed-${String(data.state).toLowerCase()}.pdf"`,
    },
  });
};
