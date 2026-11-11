import type { CoverOverride } from '@/lib/cover';

export type EditionMeta = {
  headline: string | null;
  eventOn: string | null;
  coverImageUrl: string | null;
  coverOverride: CoverOverride;
};

const KEY = 'meantvo.edition.v1';

export const EMPTY_EDITION: EditionMeta = {
  headline: null,
  eventOn: null,
  coverImageUrl: null,
  coverOverride: 'auto',
};

type Bag = Record<string, Partial<EditionMeta>>;

function store() {
  if (typeof globalThis.localStorage === 'undefined') return null;
  return globalThis.localStorage;
}

function readBag(): Bag {
  try {
    const raw = store()?.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Bag;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeBag(bag: Bag) {
  store()?.setItem(KEY, JSON.stringify(bag));
}

function asOverride(value: unknown): CoverOverride {
  if (value === 'full' || value === 'print' || value === 'monogram' || value === 'auto') return value;
  return 'auto';
}

export function readEdition(id: string): EditionMeta {
  const row = readBag()[id] ?? {};
  return {
    headline: typeof row.headline === 'string' && row.headline.trim() ? row.headline.trim() : null,
    eventOn: typeof row.eventOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.eventOn) ? row.eventOn : null,
    coverImageUrl: typeof row.coverImageUrl === 'string' && row.coverImageUrl.trim() ? row.coverImageUrl.trim() : null,
    coverOverride: asOverride(row.coverOverride),
  };
}

export function writeEdition(id: string, patch: Partial<EditionMeta>): EditionMeta {
  const next = { ...readEdition(id), ...patch };
  if (patch.headline !== undefined) {
    next.headline = patch.headline?.trim() ? patch.headline.trim() : null;
  }
  const bag = readBag();
  bag[id] = next;
  writeBag(bag);
  return next;
}

/** Explore-demo dates only. Headlines stay empty until someone chooses one. */
export function demoEventOn(id: string, today = new Date()) {
  if (id !== 'demo-occasion-birthday') return null;
  const event = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  event.setDate(event.getDate() + 44);
  const month = String(event.getMonth() + 1).padStart(2, '0');
  const day = String(event.getDate()).padStart(2, '0');
  return `${event.getFullYear()}-${month}-${day}`;
}
