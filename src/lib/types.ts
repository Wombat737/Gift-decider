export type ItemSourceType = 'manual' | 'instagram' | 'url';
export type ItemStatus = 'available' | 'reserved' | 'purchased';
export type MemberRole = 'owner' | 'viewer';

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
  no_substitution: boolean;
  status: ItemStatus;
  reserved_by: string | null;
  reserved_at: string | null;
  created_at: string;
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
};

export type NewWishlistItem = {
  title?: string;
  notes?: string;
  image_url?: string;
  source_type?: ItemSourceType;
  source_url?: string;
  buy_url?: string;
  tags?: string[];
  no_substitution?: boolean;
};

export type SessionUser = {
  id: string;
  email: string | null;
  demo: boolean;
};
