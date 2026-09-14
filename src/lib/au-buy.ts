export type AuRetailer = {
  id: string;
  label: string;
  href: (query: string) => string;
};

function q(value: string) {
  return encodeURIComponent(value.trim() || 'gift');
}

/** AU search URLs only — no affiliate API. Giver-facing. */
export const AU_RETAILERS: AuRetailer[] = [
  {
    id: 'amazon-au',
    label: 'Amazon AU',
    href: (query) => `https://www.amazon.com.au/s?k=${q(query)}`,
  },
  {
    id: 'kmart',
    label: 'Kmart',
    href: (query) => `https://www.kmart.com.au/search/?q=${q(query)}`,
  },
  {
    id: 'target-au',
    label: 'Target AU',
    href: (query) => `https://www.target.com.au/search?text=${q(query)}`,
  },
  {
    id: 'bigw',
    label: 'Big W',
    href: (query) => `https://www.bigw.com.au/search?text=${q(query)}`,
  },
];

export function auSearchQuery(title: string | null | undefined, tags: string[] = []) {
  const base = (title ?? '').trim();
  if (base) return base;
  return tags.slice(0, 3).join(' ') || 'gift';
}

export function auBuyLinks(title: string | null | undefined, tags: string[] = []) {
  const query = auSearchQuery(title, tags);
  return AU_RETAILERS.map((retailer) => ({
    id: retailer.id,
    label: retailer.label,
    url: retailer.href(query),
  }));
}
