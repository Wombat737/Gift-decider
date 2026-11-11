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
    { id: 'birthday-year', text: 'Another lovely *year*' },
    { id: 'birthday-cake', text: 'Cake, and then *some*' },
  ],
  christmas: [
    { id: 'christmas-deck', text: 'Deck the *lists*' },
    { id: 'christmas-quiet', text: 'Silent night, *loud picks*' },
    { id: 'christmas-parcel', text: 'The good *parcel*' },
  ],
  housewarming: [
    { id: 'home-digs', text: 'New digs, *fresh picks*' },
    { id: 'home-place', text: "There's no place *like it*" },
    { id: 'home-keys', text: 'Keys, at *last*' },
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
    return [
      { id: 'birthday-forty', text: 'The big *four-oh*' },
      { id: 'birthday-fabulous', text: 'Forty and *fabulous*' },
      { id: 'birthday-year', text: 'Another lovely *year*' },
    ];
  }
  if (kind === 'birthday' && age?.[1] === '13') {
    return [
      { id: 'birthday-teen', text: 'Officially a *teenager*' },
      { id: 'birthday-thirteen', text: 'Thirteen, *properly*' },
      { id: 'birthday-year', text: 'A very good *year*' },
    ];
  }
  return base;
}

/**
 * Sensible headline when the owner has not chosen one.
 * This is "{Name}'s *{nth}*", not a pun. Suggestions stay unpublished until they tap one.
 */
export function defaultHeadline(title?: string | null, ownerName?: string | null) {
  const plain = (title ?? '').trim() || 'List';
  const named = plain.match(/^(.+?)['’]s\s+(\d+)(st|nd|rd|th)\b/i);
  if (named) return `${named[1]}'s *${named[2]}${named[3].toLowerCase()}*`;
  const age = plain.match(/\b(\d+)(st|nd|rd|th)\b/i);
  const who = (ownerName ?? '').trim().split(/\s+/)[0];
  if (age && who) return `${who}'s *${age[1]}${age[2].toLowerCase()}*`;
  if (who && /birth|bday/i.test(plain)) return `${who}'s *birthday*`;
  const words = plain.split(/\s+/);
  if (words.length >= 2) {
    const last = words.pop();
    return `${words.join(' ')} *${last}*`;
  }
  return who ? `${who}'s *${plain.toLowerCase()}*` : `The *${plain.toLowerCase()}*`;
}

export function displayHeadline(chosen: string | null | undefined, title?: string | null, ownerName?: string | null) {
  const picked = chosen?.trim();
  return picked || defaultHeadline(title, ownerName);
}

/** Two or three words for the oxblood kicker, not the whole headline. */
export function kickerPhrase(title?: string | null) {
  const text = (title ?? '').toLowerCase();
  if (/christmas|xmas/.test(text)) return 'The big one';
  if (/\b13(?:th)?\b/.test(text)) return 'Teen spirit';
  if (/\b40(?:th)?\b|four-oh/.test(text)) return 'Milestone';
  if (/house|warming/.test(text)) return 'Housewarming';
  if (/birth|bday/.test(text)) return 'The big one';
  const words = (title ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
  return words.join(' ') || 'This list';
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

export function issueKicker(title: string, _headline: string | null | undefined, eventOn: string | null | undefined, today = new Date()) {
  const base = kickerPhrase(title).toUpperCase();
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

/** Issue number is how many lists are active, not the week of the year. */
export function issueDateline(date = new Date(), listCount = 1) {
  const weekday = date.toLocaleDateString('en-AU', { weekday: 'short' }).replace(/\.$/, '').toUpperCase();
  const month = date.toLocaleDateString('en-AU', { month: 'long' }).toUpperCase();
  const issue = String(Math.max(1, listCount)).padStart(2, '0');
  return `${weekday} ${date.getDate()} ${month} · ISSUE NO. ${issue}`;
}

export function listMetaLine(title: string, eventOn: string | null | undefined, pickCount: number, today = new Date()) {
  const bits = [title.trim() || 'List'];
  if (eventOn && /^\d{4}-\d{2}-\d{2}$/.test(eventOn)) {
    const [year, month, day] = eventOn.split('-').map((part) => Number(part));
    const when = new Date(year, month - 1, day);
    const weekday = when.toLocaleDateString('en-AU', { weekday: 'short' }).replace(/\.$/, '');
    const mon = when.toLocaleDateString('en-AU', { month: 'short' }).replace(/\.$/, '');
    bits.push(`${weekday} ${when.getDate()} ${mon}`);
    void today;
  }
  bits.push(`${pickCount} pick${pickCount === 1 ? '' : 's'}`);
  return bits.join(' · ');
}
