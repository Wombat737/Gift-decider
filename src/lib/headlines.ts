export type OccasionKind = 'birthday' | 'christmas' | 'housewarming' | 'baby' | 'wedding' | 'thanks' | 'general';

export type HeadlineSuggestion = {
  id: string;
  text: string;
};

export type HeadlineRun = {
  text: string;
  emphasis: boolean;
};

const SUGGESTIONS: Record<OccasionKind, HeadlineSuggestion[]> = {
  birthday: [
    { id: 'birthday-day', text: 'The big *day*' },
    { id: 'birthday-cake', text: 'Cake, and then some' },
    { id: 'birthday-year', text: 'Another lovely *year*' },
  ],
  christmas: [
    { id: 'christmas-tree', text: 'Under the *tree*' },
    { id: 'christmas-quiet', text: 'A quiet *Christmas*' },
    { id: 'christmas-parcel', text: 'The good parcel' },
  ],
  housewarming: [
    { id: 'home-door', text: 'The new *front door*' },
    { id: 'home-keys', text: 'Keys, at last' },
    { id: 'home-proper', text: 'Home, *properly*' },
  ],
  baby: [
    { id: 'baby-hello', text: 'A very small *hello*' },
    { id: 'baby-soft', text: 'Soft things' },
    { id: 'baby-new', text: 'For the *new* one' },
  ],
  wedding: [
    { id: 'wedding-day', text: 'The *day* itself' },
    { id: 'wedding-two', text: 'Two people, one list' },
    { id: 'wedding-table', text: 'A long *table*' },
  ],
  thanks: [
    { id: 'thanks-proper', text: 'A proper *thank you*' },
    { id: 'thanks-because', text: 'Just because' },
    { id: 'thanks-note', text: 'A small *note*' },
  ],
  general: [
    { id: 'general-one', text: 'This *one*' },
    { id: 'general-short', text: 'A short list' },
    { id: 'general-later', text: 'For *later*' },
  ],
};

export function occasionKind(title?: string | null): OccasionKind {
  const text = (title ?? '').toLowerCase();
  if (/birth|bday|four-oh|40th|anniversary/.test(text)) return 'birthday';
  if (/christmas|xmas|noel/.test(text)) return 'christmas';
  if (/house|warming|new home|apartment/.test(text)) return 'housewarming';
  if (/baby|shower|newborn/.test(text)) return 'baby';
  if (/wedding|engagement|bride|groom/.test(text)) return 'wedding';
  if (/thank|thanks|teacher|farewell/.test(text)) return 'thanks';
  return 'general';
}

/** A few warm, kid-appropriate lines. Nothing here is saved until the owner picks one. */
export function headlineSuggestions(title?: string | null): HeadlineSuggestion[] {
  const kind = occasionKind(title);
  const base = SUGGESTIONS[kind];
  const age = (title ?? '').match(/\b(1[0-9]|[2-9]|[1-9]0)(?:st|nd|rd|th)?\b/);
  if (kind === 'birthday' && age?.[1] === '40') {
    return [{ id: 'birthday-forty', text: 'The big *four-oh*' }, ...base.slice(0, 2)];
  }
  return base;
}

/** Split *emphasis* markers. The asterisks are not shown. */
export function headlineRuns(text: string): HeadlineRun[] {
  const runs: HeadlineRun[] = [];
  const pattern = /\*([^*]+)\*/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) runs.push({ text: text.slice(cursor, index), emphasis: false });
    runs.push({ text: match[1] ?? '', emphasis: true });
    cursor = index + match[0].length;
  }
  if (cursor < text.length) runs.push({ text: text.slice(cursor), emphasis: false });
  return runs.filter((run) => run.text.length > 0);
}

export function plainHeadline(text: string) {
  return headlineRuns(text)
    .map((run) => run.text)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

export function daysUntil(eventOn?: string | null, today = new Date()) {
  if (!eventOn || !/^\d{4}-\d{2}-\d{2}$/.test(eventOn)) return null;
  const [year, month, day] = eventOn.split('-').map((part) => Number(part));
  const target = new Date(year, month - 1, day);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((target.getTime() - start.getTime()) / 86400000);
  return diff;
}

export function issueKicker(title: string, headline: string | null | undefined, eventOn: string | null | undefined, today = new Date()) {
  const lead = plainHeadline(headline || '') || title.trim() || 'List';
  const short = lead.length > 28 ? title.trim() || lead : lead;
  const base = short.toUpperCase();
  const days = daysUntil(eventOn, today);
  if (days == null) return base;
  if (days < 0) return `${base} · PASSED`;
  if (days === 0) return `${base} · TODAY`;
  return `${base} · ${days} ${days === 1 ? 'DAY' : 'DAYS'}`;
}

export type IssueRef = {
  id: string;
  title: string;
  shareToken: string;
  createdAt: string;
};

/** Soonest upcoming date first, then undated lists in the order they were created. */
export function orderedIssues(
  occasions: IssueRef[],
  eventOn: (id: string) => string | null,
  today = new Date(),
) {
  return [...occasions].sort((a, b) => {
    const ad = daysUntil(eventOn(a.id), today);
    const bd = daysUntil(eventOn(b.id), today);
    const aFuture = ad != null && ad >= 0;
    const bFuture = bd != null && bd >= 0;
    if (aFuture && bFuture && ad !== bd) return (ad ?? 0) - (bd ?? 0);
    if (aFuture !== bFuture) return aFuture ? -1 : 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function issueDateline(date = new Date()) {
  const formatted = date.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const start = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000) + 1;
  const week = Math.max(1, Math.ceil((dayOfYear + start.getDay()) / 7));
  return `${formatted} · Issue ${week}`;
}
