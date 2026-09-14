import type { GiverConfidence, WishlistItem } from '@/lib/types';

const SIZE_HINT =
  /\b(size|xs|xxl|xl|xxs|\b[sml]\b|eu\s?\d{2}|uk\s?\d{1,2}|us\s?\d{1,2}|cm|mm|waist|chest|fit|length|eu42|eu 4[0-9])\b/i;

const WEARABLE =
  /\b(sock|shoe|boot|sneaker|shirt|tee|t-shirt|jumper|knit|jacket|coat|dress|jean|trouser|pant|hat|cap|glove|apparel|clothing|clothes|wear|fit)\b/i;

function haystack(item: WishlistItem) {
  return [item.title, item.notes, item.size_hint, item.tags.join(' ')].filter(Boolean).join(' ');
}

function looksWearable(item: WishlistItem) {
  return WEARABLE.test(haystack(item));
}

function hasSizeSignal(item: WishlistItem) {
  if (item.size_hint && item.size_hint.trim()) return true;
  return SIZE_HINT.test(`${item.notes ?? ''} ${item.size_hint ?? ''}`);
}

/** Giver-only heuristic. Not AI — uses no_substitution, buy_url, size, vibe vs exact. */
export function giverConfidence(item: WishlistItem): GiverConfidence {
  const vibeOnly = item.item_kind === 'vibe' && !item.no_substitution;
  const hasBuy = Boolean(item.buy_url?.trim());
  const wearable = looksWearable(item);
  const sized = hasSizeSignal(item);

  if (wearable && !sized) {
    return {
      level: 'needs-size',
      label: 'Needs size',
      reason: 'This looks wearable and there’s no size yet — check before you buy.',
    };
  }

  if (vibeOnly) {
    return {
      level: 'bold',
      label: 'Bold',
      reason: 'Taste / vibe rather than a specific SKU — interpret the board, don’t hunt a barcode.',
    };
  }

  if (item.no_substitution && hasBuy) {
    return {
      level: 'safe',
      label: 'Safe pick',
      reason: 'Exact item, buy link, and they locked substitutions.',
    };
  }

  if (item.item_kind === 'exact' && hasBuy) {
    return {
      level: 'safe',
      label: 'Safe pick',
      reason: 'Specific item with a buy link.',
    };
  }

  if (!hasBuy) {
    return {
      level: 'bold',
      label: 'Bold',
      reason: 'No buy link — you’ll need to hunt this down in stores.',
    };
  }

  return {
    level: 'safe',
    label: 'Safe pick',
    reason: 'Enough detail to buy with confidence.',
  };
}
