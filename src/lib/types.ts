export type ItemSourceType = 'manual' | 'instagram' | 'url';
export type ItemStatus = 'available' | 'reserved' | 'purchased';
export type ItemKind = 'exact' | 'vibe';
export type MemberRole = 'owner' | 'viewer';
export type ConfidenceLevel = 'safe' | 'bold' | 'needs-size';
export type DeliveryMethod = 'to_organiser' | 'collect' | 'other';
export type GroupGiftPhase = 'collecting' | 'ready_to_buy' | 'purchased' | 'revealed';
export type Discoverability = 'private' | 'handle';
export type MemberAccessStatus = 'active' | 'pending_request' | 'declined' | 'revoked' | 'blocked';

export type Profile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  locale: string;
  discoverability: Discoverability;
  /** Owner-only. Never send this array to a giver-facing payload. */
  taste_tags: string[];
};

export type Wishlist = {
  id: string;
  owner_id: string;
  title: string;
  share_token: string;
};

export type Occasion = {
  id: string;
  wishlist_id: string;
  title: string;
  share_token: string;
  created_at: string;
};

export type ItemPledge = {
  id: string;
  item_id: string;
  amount: number;
  display_name: string | null;
  created_at: string;
};

/** Owner-only, and only on/after the reveal date. Never includes amounts. */
export type FundedReveal = {
  from_group: true;
  contributors: string[];
  reveal_at: string | null;
};

export type LinkHealth = 'ok' | 'missing' | 'dead';

export type GiftSubstitute = {
  id: string;
  title: string;
  reason: string;
  query: string;
  exactSku: boolean;
  vibeTags: string[];
};

export type OrganiserNotice = {
  id: string;
  item_id: string;
  kind: 'ready_to_buy';
  title: string;
  body: string;
  email_preview: string;
  created_at: string;
};

export type WishlistItem = {
  id: string;
  wishlist_id: string;
  image_path: string | null;
  image_url: string | null;
  title: string | null;
  notes: string | null;
  source_type: ItemSourceType;
  source_url: string | null;
  buy_url: string | null;
  tags: string[];
  item_kind: ItemKind;
  size_hint: string | null;
  target_amount: number | null;
  occasion_id: string | null;
  no_substitution: boolean;
  is_group_gift: boolean;
  funded_at: string | null;
  /** Calendar date (YYYY-MM-DD). Owner sees who chipped in on/after this date — not when funded. */
  reveal_at: string | null;
  buy_url_dead: boolean;
  organiser_name: string | null;
  pay_instructions: string | null;
  delivery_method: DeliveryMethod | null;
  delivery_note: string | null;
  ready_to_buy_notified_at: string | null;
  status: ItemStatus;
  reserved_by: string | null;
  reserved_at: string | null;
  created_at: string;
  pledges?: ItemPledge[];
  notices?: OrganiserNotice[];
  /** Set on owner payloads only on/after reveal_at. Givers never need this. */
  reveal?: FundedReveal;
};

export type WishlistMember = {
  id: string;
  wishlist_id: string;
  user_id: string | null;
  email: string | null;
  role: MemberRole;
  invite_token: string;
  accepted_at: string | null;
  status?: MemberAccessStatus;
  requested_by?: string | null;
  responded_at?: string | null;
};

export type HandleSearchHit = {
  id: string;
  handle: string | null;
  display_name: string | null;
  access_status: MemberAccessStatus | 'none';
  can_open: boolean;
  share_token: string | null;
  is_public_link: boolean;
};

export type GiverPerson = {
  id: string;
  recipient_id: string;
  handle: string | null;
  display_name: string | null;
  label: string | null;
  access_status: MemberAccessStatus | 'none';
  can_open: boolean;
  share_token: string | null;
  created_at: string;
};

export type GiverAccessRequest = {
  member_id: string;
  giver_id: string | null;
  handle: string | null;
  display_name: string | null;
  created_at: string;
};

export type ItemGiverComment = {
  id: string;
  item_id: string;
  author_id: string;
  author_display_name: string;
  body: string;
  created_at: string;
  edited_at: string | null;
};

export type GiftSearchHit = {
  id: string;
  rank: number;
};

export type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  provider: string | null;
  stub?: boolean;
};

export type SharedWishlist = {
  id: string;
  title: string;
  owner_handle: string | null;
  owner_display_name: string | null;
  occasion_id: string | null;
  occasion_title: string | null;
};

export type NewWishlistItem = {
  title?: string;
  notes?: string;
  image_url?: string;
  source_type?: ItemSourceType;
  source_url?: string;
  buy_url?: string;
  tags?: string[];
  item_kind?: ItemKind;
  size_hint?: string | null;
  target_amount?: number | null;
  occasion_id?: string | null;
  no_substitution?: boolean;
};

export type UpdateWishlistItem = {
  title?: string;
  notes?: string | null;
  image_url?: string | null;
  source_type?: ItemSourceType;
  source_url?: string | null;
  buy_url?: string | null;
  tags?: string[];
  item_kind?: ItemKind;
  size_hint?: string | null;
  target_amount?: number | null;
  occasion_id?: string | null;
  no_substitution?: boolean;
};

export type SessionUser = {
  id: string;
  email: string | null;
  demo: boolean;
};

export type GiverConfidence = {
  level: ConfidenceLevel;
  label: string;
  reason: string;
};
