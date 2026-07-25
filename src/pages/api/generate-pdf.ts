import type { APIRoute } from 'astro';
import { generateQuitclaimDeed } from '../../lib/pdf';

// ─── number-to-words helpers ───────────────────────────────────────────────

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function numberToWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '';
  if (n === 0) return 'Zero';

  const intPart = Math.floor(n);

  function below1000(num: number): string {
    if (num === 0) return '';
    if (num < 20) return ones[num];
    if (num < 100) {
      const t = tens[Math.floor(num / 10)];
      const o = ones[num % 10];
      return o ? `${t}-${o}` : t;
    }
    const h = ones[Math.floor(num / 100)];
    const rest = below1000(num % 100);
    return rest ? `${h} Hundred ${rest}` : `${h} Hundred`;
  }

  const billions  = Math.floor(intPart / 1_000_000_000);
  const millions  = Math.floor((intPart % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((intPart % 1_000_000) / 1_000);
  const remainder = intPart % 1_000;

  const parts: string[] = [];
  if (billions)  parts.push(`${below1000(billions)} Billion`);
  if (millions)  parts.push(`${below1000(millions)} Million`);
  if (thousands) parts.push(`${below1000(thousands)} Thousand`);
  if (remainder) parts.push(below1000(remainder));

  return parts.join(' ');
}

// Matches numeric-only consideration values: "90", "90.50", "$100", "$1,000.00", "USD 50"
const numericPattern = /^(\$|USD\s*)?[\d,]+(\.\d+)?$/i;

/**
 * Converts a raw consideration input to a legal USD phrase.
 *
 * - Empty / missing  → "Ten Dollars ($10.00) and other good and valuable consideration"
 * - Pure number      → e.g. "Ninety Dollars ($90.00) and other good and valuable consideration"
 * - Already text     → passed through unchanged (e.g. "love and affection")
 */
function formatConsideration(raw: string | undefined | null): string {
  const SUFFIX = 'and other good and valuable consideration';
  const DEFAULT = `Ten Dollars ($10.00) ${SUFFIX}`;

  if (!raw || raw.trim() === '') return DEFAULT;

  const trimmed = raw.trim();
  const withoutSymbol = trimmed.replace(/^\$|^USD\s*/i, '').replace(/,/g, '');
  const amount = parseFloat(withoutSymbol);

  if (!isNaN(amount) && numericPattern.test(trimmed)) {
    const dollars = Math.floor(amount);
    const cents   = Math.round((amount - dollars) * 100);
    const words   = numberToWords(dollars);
    const usdFmt  = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const dollarsLabel = dollars === 1 ? 'Dollar' : 'Dollars';
    if (cents === 0) {
      return `${words} ${dollarsLabel} ($${usdFmt}) ${SUFFIX}`;
    }
    // e.g. "Ninety and 50/100 Dollars ($90.50) and other good and valuable consideration"
    return `${words} and ${cents}/100 ${dollarsLabel} ($${usdFmt}) ${SUFFIX}`;
  }

  // Non-numeric (e.g. "love and affection") — pass through unchanged
  return trimmed;
}

// ─── API route ─────────────────────────────────────────────────────────────

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
    consideration: formatConsideration(data.consideration),
    state: data.state,
  });

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="quitclaim-deed-${String(data.state).toLowerCase()}.pdf"`,
    },
  });
};
