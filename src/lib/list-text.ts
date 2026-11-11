export type PlainPick = {
  title?: string | null;
  target_amount?: number | null;
  buy_url?: string | null;
};

function money(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  if (!Number.isFinite(rounded) || rounded <= 0) return null;
  return Number.isInteger(rounded) ? `$${rounded}` : `$${rounded.toFixed(2)}`;
}

/** Hostname without www, so a link reads as a shop name. */
export function storeNameFromUrl(url?: string | null) {
  const raw = (url ?? '').trim();
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname.replace(/^www\./i, '');
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Plain-text list for people who find links confusing.
 * Name, price, store, and link only. Never reservation or purchase status.
 */
export function listAsPlainText(listName: string, picks: PlainPick[]) {
  const lines = [(listName || 'List').trim() || 'List', ''];
  picks.forEach((pick, index) => {
    if (index > 0) lines.push('');
    lines.push((pick.title ?? '').trim() || 'Untitled gift');
    const price = typeof pick.target_amount === 'number' ? money(pick.target_amount) : null;
    if (price) lines.push(price);
    const store = storeNameFromUrl(pick.buy_url);
    if (store) lines.push(store);
    const link = (pick.buy_url ?? '').trim();
    if (link) lines.push(link);
  });
  return lines.join('\n').trimEnd();
}
