import { auSearchQuery } from '@/lib/au-buy';
import type { GiftSubstitute, WishlistItem } from '@/lib/types';

type CatalogEntry = {
  id: string;
  title: string;
  keywords: string[];
  vibeTags: string[];
  reason: string;
};

const CATALOG: CatalogEntry[] = [
  {
    id: 'linen-throw-sage',
    title: 'Sage washed linen throw',
    keywords: ['linen', 'throw', 'blanket', 'quilt'],
    vibeTags: ['cozy', 'home', 'soft', 'minimal'],
    reason: 'Same washed-linen nap, quieter colour — still a sofa gift, not a gadget.',
  },
  {
    id: 'linen-throw-oatmeal',
    title: 'Oatmeal cotton throw',
    keywords: ['linen', 'throw', 'blanket', 'quilt'],
    vibeTags: ['cozy', 'home', 'soft', 'kitchen'],
    reason: 'Soft house texture in oatmeal. Matches a cozy / home board.',
  },
  {
    id: 'waffle-throw',
    title: 'Waffle-knit cotton throw',
    keywords: ['linen', 'throw', 'blanket', 'quilt', 'knit'],
    vibeTags: ['cozy', 'home', 'soft'],
    reason: 'A close tactile swap if linen is gone — still a wrap-up-on-the-couch gift.',
  },
  {
    id: 'cookbook-weeknight',
    title: '30-minute weeknight cookbook',
    keywords: ['cookbook', 'weeknight', 'recipe', 'cooking', 'food'],
    vibeTags: ['practical', 'food', 'kitchen'],
    reason: 'Same job: dinner on a Tuesday, not a 40-ingredient flex.',
  },
  {
    id: 'cookbook-one-pan',
    title: 'One-pan dinners cookbook',
    keywords: ['cookbook', 'weeknight', 'recipe', 'cooking', 'food'],
    vibeTags: ['practical', 'food', 'kitchen'],
    reason: 'Practical food vibe — weeknight timing, low fuss.',
  },
  {
    id: 'espresso-compact',
    title: 'Compact home espresso machine',
    keywords: ['espresso', 'coffee', 'machine', 'barista'],
    vibeTags: ['kitchen', 'coffee'],
    reason: 'Still a home espresso, not a café two-group. Kitchen + coffee vibes.',
  },
  {
    id: 'espresso-entry',
    title: 'Entry-level espresso machine',
    keywords: ['espresso', 'coffee', 'machine', 'barista'],
    vibeTags: ['kitchen', 'coffee', 'practical'],
    reason: 'Solid entry machine in the same coffee-at-home lane.',
  },
  {
    id: 'plant-snake',
    title: 'Snake plant',
    keywords: ['plant', 'survive', 'snake', 'pothos', 'nursery'],
    vibeTags: ['home', 'green'],
    reason: 'Hardy indoor plant — the “survive me” brief.',
  },
  {
    id: 'plant-pothos',
    title: 'Pothos in a simple pot',
    keywords: ['plant', 'survive', 'snake', 'pothos', 'nursery'],
    vibeTags: ['home', 'green'],
    reason: 'Green / home vibe, nursery pickup energy, very hard to kill.',
  },
  {
    id: 'socks-merino',
    title: 'Merino hiking crew socks',
    keywords: ['sock', 'merino', 'hiking'],
    vibeTags: ['outdoors'],
    reason: 'Crew-height merino, not dress socks — outdoors vibe.',
  },
  {
    id: 'mug-speckle',
    title: 'Speckled ceramic mug 12oz',
    keywords: ['mug', 'ceramic', 'speckle', 'oatmeal', 'glaze'],
    vibeTags: ['cozy', 'kitchen', 'coffee'],
    reason: 'Same Saturday-market mug energy: matte speckle, coffee-sized.',
  },
];

function haystack(item: Pick<WishlistItem, 'title' | 'notes' | 'tags'>) {
  return [item.title, item.notes, item.tags.join(' ')].filter(Boolean).join(' ').toLowerCase();
}

function vibeOverlap(entry: CatalogEntry, tags: string[]) {
  const set = new Set(tags.map((tag) => tag.toLowerCase()));
  return entry.vibeTags.filter((tag) => set.has(tag)).length;
}

function fromCatalog(item: WishlistItem, entry: CatalogEntry): GiftSubstitute {
  const vibes = entry.vibeTags.filter((tag) => item.tags.map((t) => t.toLowerCase()).includes(tag));
  const vibeBit = vibes.length > 0 ? ` Matches ${vibes.join(' · ')}.` : '';
  return {
    id: `${entry.id}-${item.id}`,
    title: entry.title,
    reason: `${entry.reason}${vibeBit}`,
    query: auSearchQuery(entry.title, entry.vibeTags),
    exactSku: false,
    vibeTags: entry.vibeTags,
  };
}

function catalogMatches(item: WishlistItem) {
  const text = haystack(item);
  const scored = CATALOG.map((entry) => {
    const keywordHit = entry.keywords.some((word) => text.includes(word));
    const vibes = vibeOverlap(entry, item.tags);
    if (!keywordHit && vibes === 0) return null;
    const score = (keywordHit ? 4 : 0) + vibes;
    if (score <= 0) return null;
    if (entry.title.toLowerCase() === (item.title ?? '').trim().toLowerCase()) return null;
    return { entry, score };
  }).filter((row): row is { entry: CatalogEntry; score: number } => Boolean(row));

  scored.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));
  return scored;
}

function vibeFallback(item: WishlistItem): GiftSubstitute[] {
  const query = auSearchQuery(item.title, item.tags);
  const vibe = item.tags.slice(0, 3).join(' · ') || 'their board';
  return [
    {
      id: `vibe-search-${item.id}`,
      title: query,
      reason: `No close catalog swap. Search AU stores using the title plus ${vibe}.`,
      query,
      exactSku: false,
      vibeTags: [...item.tags],
    },
  ];
}

/**
 * Deterministic giver-only substitutes. Honour no_substitution: return nothing.
 * Dead-link heal may still flag a broken URL — it must not suggest swaps.
 */
export function suggestSubstitutes(item: WishlistItem): GiftSubstitute[] {
  if (item.no_substitution) return [];

  const matches = catalogMatches(item)
    .slice(0, 3)
    .map(({ entry }) => fromCatalog(item, entry));

  if (matches.length === 0) return vibeFallback(item);
  return matches;
}

export function substituteModeCopy(item: Pick<WishlistItem, 'no_substitution' | 'item_kind'>) {
  if (item.no_substitution) {
    return 'They locked substitutions. If the link is dead we only flag it — no alternatives.';
  }
  if (item.item_kind === 'vibe') {
    return 'Taste / vibe item — close swaps that stay on-board are fair game.';
  }
  return 'Close alternatives from the title and vibe board. Not a barcode hunt.';
}
