// Money + misc formatting helpers — single source of truth so price rendering
// is consistent across the storefront (no more inline `currencyCode === 'INR'` checks).

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
};

export interface MoneyLike {
  amount: string | number;
  currencyCode: string;
}

export function money(m?: MoneyLike | null): string {
  if (!m) return '';
  const symbol = CURRENCY_SYMBOLS[m.currencyCode] ?? '';
  const amount = Number(m.amount);
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return symbol ? `${symbol}${formatted}` : `${formatted} ${m.currencyCode}`;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? 'test store';

// Strip HTML tags + decode a few common entities — for fields that arrive as
// rich text but must render as plain text (e.g. banner headings/subtitles).
export function stripHtml(input?: string | null): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
