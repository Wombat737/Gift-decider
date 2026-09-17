import {
  ACCESS_REQUEST_WINDOW_MS,
  EMAIL_INVITE_WINDOW_MS,
  HANDLE_SEARCH_WINDOW_MS,
  assertRateLimit,
  canGiverOpenWishlist,
  giverCanUseComments,
  matchesHandleSearch,
  normalizeHandleQuery,
  normalizeTasteTags,
  pendingRequestExpired,
  searchWishlistItemsStrict,
  shareTokenFromInput,
  type GiverSocialRateKind,
} from '@/lib/giver-social';
import { DEMO_SHARE_TOKEN, getDemoItem, listDemoItems, registerDemoReset } from '@/lib/demo-store';
import type {
  Discoverability,
  GiverAccessRequest,
  GiverPerson,
  HandleSearchHit,
  ItemGiverComment,
  MemberAccessStatus,
  Profile,
} from '@/lib/types';

const STORAGE_KEY = 'giftdecider.demo.social.v1';
const DEMO_USER_ID = 'demo-user';

type DemoDirectoryPerson = {
  id: string;
  handle: string;
  display_name: string;
  discoverability: Discoverability;
  is_public_link: boolean;
  share_token: string | null;
};

type DemoPin = {
  id: string;
  recipient_id: string;
  label: string | null;
  created_at: string;
};

type DemoMember = {
  id: string;
  recipient_id: string;
  giver_id: string;
  status: MemberAccessStatus;
  requested_by: string | null;
  accepted_at: string | null;
  created_at: string;
};

type DemoInvite = { email: string; created_at: string };

type DemoSocialBundle = {
  discoverability: Discoverability;
  taste_tags: string[];
  pins: DemoPin[];
  members: DemoMember[];
  requests: DemoMember[];
  comments: ItemGiverComment[];
  invites: DemoInvite[];
  rate: { kind: GiverSocialRateKind; at: number }[];
  blocks: string[];
};

const directory: DemoDirectoryPerson[] = [
  {
    id: 'demo-person-mum',
    handle: 'mum',
    display_name: 'Mum',
    discoverability: 'handle',
    is_public_link: false,
    share_token: null,
  },
  {
    id: 'demo-person-priya',
    handle: 'priya',
    display_name: 'Priya',
    discoverability: 'handle',
    is_public_link: false,
    share_token: DEMO_SHARE_TOKEN,
  },
  {
    id: 'demo-person-secret',
    handle: 'secretpat',
    display_name: 'Coral Coast',
    discoverability: 'private',
    is_public_link: false,
    share_token: null,
  },
];

function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function seedBundle(): DemoSocialBundle {
  return {
    discoverability: 'handle',
    taste_tags: ['linen', 'trail running', 'no candles'],
    pins: [
      {
        id: 'demo-pin-mum',
        recipient_id: 'demo-person-mum',
        label: 'Mum',
        created_at: '2026-09-01T00:00:00.000Z',
      },
      {
        id: 'demo-pin-priya',
        recipient_id: 'demo-person-priya',
        label: null,
        created_at: '2026-09-02T00:00:00.000Z',
      },
    ],
    members: [
      {
        id: 'demo-member-mum',
        recipient_id: 'demo-person-mum',
        giver_id: DEMO_USER_ID,
        status: 'pending_request',
        requested_by: DEMO_USER_ID,
        accepted_at: null,
        created_at: '2026-09-01T00:00:00.000Z',
      },
      {
        id: 'demo-member-priya',
        recipient_id: 'demo-person-priya',
        giver_id: DEMO_USER_ID,
        status: 'active',
        requested_by: DEMO_USER_ID,
        accepted_at: '2026-09-02T00:00:00.000Z',
        created_at: '2026-09-02T00:00:00.000Z',
      },
    ],
    requests: [
      {
        id: 'demo-request-alex',
        recipient_id: DEMO_USER_ID,
        giver_id: 'demo-person-alex',
        status: 'pending_request',
        requested_by: 'demo-person-alex',
        accepted_at: null,
        created_at: '2026-09-10T00:00:00.000Z',
      },
    ],
    comments: [
      {
        id: 'demo-comment-mug-1',
        item_id: 'demo-mug',
        author_id: 'demo-person-alex',
        author_display_name: 'Alex',
        body: 'I’ll grab this unless someone else is already on it.',
        created_at: '2026-09-08T00:00:00.000Z',
        edited_at: null,
      },
    ],
    invites: [],
    rate: [],
    blocks: [],
  };
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

let bundle: DemoSocialBundle = seedBundle();
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of [...listeners]) listener();
}

function persist() {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
  } catch {
    // ignore quota
  }
}

function adopt() {
  if (loaded) return;
  loaded = true;
  if (!canUseStorage()) {
    bundle = seedBundle();
    return;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      bundle = seedBundle();
      persist();
      return;
    }
    const parsed = JSON.parse(raw) as Partial<DemoSocialBundle>;
    const fallback = seedBundle();
    bundle = {
      ...fallback,
      ...parsed,
      taste_tags: Array.isArray(parsed.taste_tags) ? parsed.taste_tags : fallback.taste_tags,
      pins: Array.isArray(parsed.pins) && parsed.pins.length ? parsed.pins : fallback.pins,
      members: Array.isArray(parsed.members) && parsed.members.length ? parsed.members : fallback.members,
      requests: Array.isArray(parsed.requests) && parsed.requests.length ? parsed.requests : fallback.requests,
      comments: Array.isArray(parsed.comments) ? parsed.comments : fallback.comments,
      invites: Array.isArray(parsed.invites) ? parsed.invites : [],
      rate: Array.isArray(parsed.rate) ? parsed.rate : [],
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
    };
  } catch {
    bundle = seedBundle();
  }
}

export function subscribeDemoSocial(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetDemoSocial() {
  loaded = true;
  bundle = seedBundle();
  persist();
  notify();
}

registerDemoReset(resetDemoSocial);

function write(next: DemoSocialBundle) {
  bundle = next;
  persist();
  notify();
}

function personById(id: string) {
  if (id === 'demo-person-alex') {
    return {
      id,
      handle: 'alex',
      display_name: 'Alex',
      discoverability: 'handle' as const,
      is_public_link: false,
      share_token: null as string | null,
    };
  }
  return directory.find((row) => row.id === id) ?? null;
}

function memberFor(recipientId: string): DemoMember | undefined {
  adopt();
  return bundle.members.find((row) => row.recipient_id === recipientId && row.giver_id === DEMO_USER_ID);
}

function pinToPerson(pin: DemoPin): GiverPerson {
  const person = personById(pin.recipient_id);
  const member = memberFor(pin.recipient_id);
  const status = member?.status ?? 'none';
  const canOpen = canGiverOpenWishlist({
    memberStatus: status,
    accepted: Boolean(member?.accepted_at),
    hasShareToken: Boolean(person?.share_token),
    isPublicLink: Boolean(person?.is_public_link),
  });
  return {
    id: pin.id,
    recipient_id: pin.recipient_id,
    handle: person?.handle ?? null,
    display_name: person?.display_name ?? null,
    label: pin.label,
    access_status: status,
    can_open: canOpen,
    share_token: canOpen ? person?.share_token ?? null : null,
    created_at: pin.created_at,
  };
}

export function getDemoOwnSocialProfile(base: Profile): Profile {
  adopt();
  return {
    ...base,
    discoverability: bundle.discoverability,
    taste_tags: [...bundle.taste_tags],
  };
}

export function updateDemoOwnSocialProfile(patch: {
  discoverability?: Discoverability;
  taste_tags?: string[];
}): Profile {
  adopt();
  write({
    ...bundle,
    discoverability: patch.discoverability ?? bundle.discoverability,
    taste_tags: patch.taste_tags ? normalizeTasteTags(patch.taste_tags) : bundle.taste_tags,
  });
  return getDemoOwnSocialProfile({
    id: DEMO_USER_ID,
    handle: 'jordan',
    display_name: 'Jordan',
    locale: 'en-AU',
    discoverability: bundle.discoverability,
    taste_tags: [...bundle.taste_tags],
  });
}

export function listDemoGiverPeople(): GiverPerson[] {
  adopt();
  return bundle.pins.map(pinToPerson);
}

export function unlistDemoGiverPerson(pinId: string) {
  adopt();
  write({ ...bundle, pins: bundle.pins.filter((pin) => pin.id !== pinId) });
}

export function searchDemoProfilesByHandle(query: string): HandleSearchHit[] {
  adopt();
  assertRateLimit(bundle.rate, 'handle_search');
  write({ ...bundle, rate: [...bundle.rate, { kind: 'handle_search', at: Date.now() }] });
  const q = normalizeHandleQuery(query);
  return directory
    .filter((person) =>
      matchesHandleSearch({
        handle: person.handle,
        displayName: person.display_name,
        query: q,
        discoverability: person.discoverability,
      }),
    )
    .map((person) => {
      const member = memberFor(person.id);
      const status = member?.status ?? 'none';
      const canOpen = canGiverOpenWishlist({
        memberStatus: status,
        accepted: Boolean(member?.accepted_at),
        hasShareToken: Boolean(person.share_token),
        isPublicLink: person.is_public_link,
      });
      return {
        id: person.id,
        handle: person.handle,
        display_name: person.display_name,
        access_status: status,
        can_open: canOpen,
        share_token: canOpen ? person.share_token : null,
        is_public_link: person.is_public_link,
      };
    });
}

export function requestDemoGiverAccess(recipientId: string) {
  adopt();
  if (bundle.blocks.includes(DEMO_USER_ID) && recipientId === DEMO_USER_ID) {
    throw new Error('This person is not accepting requests from you');
  }
  assertRateLimit(bundle.rate, 'access_request');
  const person = personById(recipientId);
  if (!person || person.discoverability === 'private') {
    throw new Error('No one matches that handle');
  }

  const existingPin = bundle.pins.find((pin) => pin.recipient_id === recipientId);
  const pins = existingPin
    ? bundle.pins
    : [...bundle.pins, { id: id('pin'), recipient_id: recipientId, label: null, created_at: nowIso() }];

  let members = bundle.members;
  let member = memberFor(recipientId);
  if (person.is_public_link || person.share_token) {
    if (!member) {
      member = {
        id: id('member'),
        recipient_id: recipientId,
        giver_id: DEMO_USER_ID,
        status: 'active',
        requested_by: DEMO_USER_ID,
        accepted_at: nowIso(),
        created_at: nowIso(),
      };
      members = [...members, member];
    } else {
      member = { ...member, status: 'active', accepted_at: member.accepted_at ?? nowIso() };
      members = members.map((row) => (row.id === member!.id ? member! : row));
    }
  } else if (!member || member.status !== 'pending_request') {
    if (member) {
      member = { ...member, status: 'pending_request', accepted_at: null, created_at: nowIso() };
      members = members.map((row) => (row.id === member!.id ? member! : row));
    } else {
      member = {
        id: id('member'),
        recipient_id: recipientId,
        giver_id: DEMO_USER_ID,
        status: 'pending_request',
        requested_by: DEMO_USER_ID,
        accepted_at: null,
        created_at: nowIso(),
      };
      members = [...members, member];
    }
  }

  write({
    ...bundle,
    pins,
    members,
    rate: [...bundle.rate, { kind: 'access_request', at: Date.now() }],
  });
  return { status: member.status, share_token: member.status === 'active' ? person.share_token : null };
}

export function inviteDemoGiverByEmail(email: string) {
  adopt();
  const cleaned = email.trim().toLowerCase();
  if (!cleaned || !cleaned.includes('@')) throw new Error('Enter an email');
  assertRateLimit(bundle.rate, 'email_invite');
  const known = directory.find((person) => `${person.handle}@giftdecider.local` === cleaned);
  write({
    ...bundle,
    rate: [...bundle.rate, { kind: 'email_invite', at: Date.now() }],
    invites: known ? bundle.invites : [...bundle.invites, { email: cleaned, created_at: nowIso() }],
  });
  if (known) return requestDemoGiverAccess(known.id);
  return { kind: 'stub' as const, email: cleaned, status: 'pending_invite' };
}

export function listDemoGiverAccessRequests(): GiverAccessRequest[] {
  adopt();
  return bundle.requests
    .filter((row) => row.status === 'pending_request' && !pendingRequestExpired(row.created_at))
    .map((row) => {
      const person = personById(row.giver_id);
      return {
        member_id: row.id,
        giver_id: row.giver_id,
        handle: person?.handle ?? 'alex',
        display_name: person?.display_name ?? 'Alex',
        created_at: row.created_at,
      };
    });
}

export function respondDemoGiverAccess(memberId: string, action: 'accept' | 'decline' | 'block') {
  adopt();
  const request = bundle.requests.find((row) => row.id === memberId);
  if (!request) throw new Error('Request not found');
  if (pendingRequestExpired(request.created_at)) {
    write({
      ...bundle,
      requests: bundle.requests.map((row) =>
        row.id === memberId ? { ...row, status: 'declined' } : row,
      ),
    });
    throw new Error('That request expired');
  }
  const status: MemberAccessStatus = action === 'accept' ? 'active' : action === 'decline' ? 'declined' : 'blocked';
  write({
    ...bundle,
    requests: bundle.requests.map((row) =>
      row.id === memberId
        ? { ...row, status, accepted_at: action === 'accept' ? nowIso() : null }
        : row,
    ),
    blocks: action === 'block' ? [...bundle.blocks, request.giver_id] : bundle.blocks,
  });
}

export function listDemoItemGiverComments(itemId: string, opts: { isOwnerRoute: boolean; loggedIn: boolean }) {
  if (opts.isOwnerRoute) return [];
  adopt();
  if (
    !giverCanUseComments({
      loggedIn: opts.loggedIn,
      isOwner: false,
      memberStatus: 'active',
      demoGiverPersona: true,
    })
  ) {
    return [];
  }
  return bundle.comments.filter((row) => row.item_id === itemId).map((row) => ({ ...row }));
}

export function postDemoItemGiverComment(itemId: string, body: string, opts: { demoGiverPersona: boolean }) {
  const cleaned = body.trim();
  if (cleaned.length < 1 || cleaned.length > 2000) {
    throw new Error('Keep notes between 1 and 2000 characters');
  }
  if (!opts.demoGiverPersona) {
    throw new Error('Not allowed');
  }
  if (!getDemoItem(itemId)) throw new Error('Gift not found');
  adopt();
  const row: ItemGiverComment = {
    id: id('comment'),
    item_id: itemId,
    author_id: DEMO_USER_ID,
    author_display_name: 'You',
    body: cleaned,
    created_at: nowIso(),
    edited_at: null,
  };
  write({ ...bundle, comments: [...bundle.comments, row] });
  return row;
}

export function editDemoItemGiverComment(commentId: string, body: string) {
  const cleaned = body.trim();
  if (cleaned.length < 1 || cleaned.length > 2000) {
    throw new Error('Keep notes between 1 and 2000 characters');
  }
  adopt();
  const existing = bundle.comments.find((row) => row.id === commentId);
  if (!existing) throw new Error('Note not found');
  if (existing.author_id !== DEMO_USER_ID) throw new Error('You can only edit your own note');
  const next = { ...existing, body: cleaned, edited_at: nowIso() };
  write({
    ...bundle,
    comments: bundle.comments.map((row) => (row.id === commentId ? next : row)),
  });
  return next;
}

export function deleteDemoItemGiverComment(commentId: string) {
  adopt();
  const existing = bundle.comments.find((row) => row.id === commentId);
  if (!existing) return;
  if (existing.author_id !== DEMO_USER_ID) throw new Error('You can only delete your own note');
  write({ ...bundle, comments: bundle.comments.filter((row) => row.id !== commentId) });
}

export function searchDemoWishlistItems(query: string) {
  adopt();
  return searchWishlistItemsStrict(listDemoItems(), query, bundle.taste_tags);
}

export function demoOwnerHasTasteTags() {
  adopt();
  return bundle.taste_tags.length > 0;
}

export function parseDemoShareInput(raw: string) {
  return shareTokenFromInput(raw);
}

export function demoRateWindows() {
  return {
    handleSearchMs: HANDLE_SEARCH_WINDOW_MS,
    accessRequestMs: ACCESS_REQUEST_WINDOW_MS,
    emailInviteMs: EMAIL_INVITE_WINDOW_MS,
  };
}
