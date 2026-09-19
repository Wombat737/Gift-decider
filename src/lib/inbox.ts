import type { GiverAccessRequest, GiverPerson } from '@/lib/types';

const INBOX_STORAGE_KEY = 'giftdecider.inbox.v1';

export type InboxSeen = {
  /** Pins last observed as waiting on the recipient. */
  pendingPinIds: string[];
  /** Active pins that flipped from waiting and have not been opened on People yet. */
  unackedReadyIds: string[];
};

let memorySeen: InboxSeen | null = null;

function canStore() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function resetInboxSeen() {
  memorySeen = null;
  if (canStore()) {
    try {
      window.localStorage.removeItem(INBOX_STORAGE_KEY);
    } catch {
      // quota / private mode
    }
  }
}

export function loadInboxSeen(): InboxSeen | null {
  if (memorySeen) return memorySeen;
  if (!canStore()) return null;
  try {
    const raw = window.localStorage.getItem(INBOX_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InboxSeen>;
    if (!Array.isArray(parsed.pendingPinIds) || !Array.isArray(parsed.unackedReadyIds)) return null;
    memorySeen = {
      pendingPinIds: parsed.pendingPinIds.filter((id): id is string => typeof id === 'string'),
      unackedReadyIds: parsed.unackedReadyIds.filter((id): id is string => typeof id === 'string'),
    };
    return memorySeen;
  } catch {
    return null;
  }
}

export function saveInboxSeen(seen: InboxSeen) {
  memorySeen = {
    pendingPinIds: [...seen.pendingPinIds],
    unackedReadyIds: [...seen.unackedReadyIds],
  };
  if (!canStore()) return;
  try {
    window.localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(memorySeen));
  } catch {
    // quota / private mode
  }
}

export function pendingRequestCount(requests: Pick<GiverAccessRequest, 'member_id'>[]) {
  return requests.length;
}

export function badgeCountLabel(count: number): string | null {
  if (count <= 0) return null;
  return count > 9 ? '9+' : String(count);
}

function personLabel(person: Pick<GiverPerson, 'label' | 'display_name' | 'handle'>) {
  return person.label || person.display_name || (person.handle ? `@${person.handle}` : 'Someone');
}

export function requestBannerText(requests: GiverAccessRequest[]): string | null {
  if (requests.length === 0) return null;
  if (requests.length === 1) {
    const row = requests[0]!;
    const name = row.display_name || (row.handle ? `@${row.handle}` : 'Someone');
    return `${name} asked to buy gifts for you.`;
  }
  return `${requests.length} people asked to buy gifts for you.`;
}

export function acceptBannerText(people: GiverPerson[]): string | null {
  if (people.length === 0) return null;
  if (people.length === 1) {
    return `${personLabel(people[0]!)} accepted — you can open their gifts.`;
  }
  return `${people.length} people accepted — their lists are ready.`;
}

export function applyPeopleInbox(
  people: GiverPerson[],
  seen: InboxSeen | null,
): { newlyReady: GiverPerson[]; nextSeen: InboxSeen } {
  const pendingPinIds = people
    .filter((person) => person.access_status === 'pending_request')
    .map((person) => person.id);

  if (!seen) {
    return {
      newlyReady: [],
      nextSeen: { pendingPinIds, unackedReadyIds: [] },
    };
  }

  const flipped = people.filter(
    (person) => person.access_status === 'active' && seen.pendingPinIds.includes(person.id),
  );
  const unackedReadyIds = [...new Set([...seen.unackedReadyIds, ...flipped.map((person) => person.id)])];
  const newlyReady = people.filter((person) => unackedReadyIds.includes(person.id));

  return {
    newlyReady,
    nextSeen: { pendingPinIds, unackedReadyIds },
  };
}

export function ackReadyInbox(seen: InboxSeen): InboxSeen {
  return { pendingPinIds: [...seen.pendingPinIds], unackedReadyIds: [] };
}

export function isNewlyReadyPin(personId: string, newlyReady: GiverPerson[]) {
  return newlyReady.some((person) => person.id === personId);
}
