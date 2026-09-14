export type ItemSourceType = 'manual' | 'instagram' | 'url';
export type ItemStatus = 'available' | 'reserved' | 'purchased';
export type ItemKind = 'exact' | 'vibe';
export type MemberRole = 'owner' | 'viewer';
export type ConfidenceLevel = 'safe' | 'bold' | 'needs-size';

export type Profile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  locale: string;
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
  status: ItemStatus;
  reserved_by: string | null;
  reserved_at: string | null;
  created_at: string;
  pledges?: ItemPledge[];
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
