/**
 * Surprise-safe column contract.
 * Keep in sync with supabase/migrations/*_live_rls.sql
 * (GIVER_ONLY_ITEM_COLUMNS / OWNER_ITEM_COLUMNS comments).
 *
 * Owners may read catalog fields only. Givers see status / heal / pledges
 * via share-token RPCs (security definer), never via owner SELECT.
 */

export const OWNER_ITEM_COLUMNS = [
  'id',
  'wishlist_id',
  'image_path',
  'image_url',
  'title',
  'notes',
  'source_type',
  'source_url',
  'buy_url',
  'tags',
  'item_kind',
  'size_hint',
  'target_amount',
  'occasion_id',
  'no_substitution',
  'created_at',
] as const;

/** Literal so Supabase `.select()` keeps a typed row (not `string`). */
export const OWNER_ITEM_SELECT =
  'id, wishlist_id, image_path, image_url, title, notes, source_type, source_url, buy_url, tags, item_kind, size_hint, target_amount, occasion_id, no_substitution, created_at' as const;

export const GIVER_ONLY_ITEM_COLUMNS = [
  'status',
  'reserved_by',
  'reserved_at',
  'is_group_gift',
  'funded_at',
  'reveal_at',
  'buy_url_dead',
  'organiser_name',
  'pay_instructions',
  'delivery_method',
  'delivery_note',
  'ready_to_buy_notified_at',
] as const;

export type OwnerItemColumn = (typeof OWNER_ITEM_COLUMNS)[number];
export type GiverOnlyItemColumn = (typeof GIVER_ONLY_ITEM_COLUMNS)[number];

export function ownerSelectIncludesGiverColumn() {
  const giver = new Set<string>(GIVER_ONLY_ITEM_COLUMNS);
  return OWNER_ITEM_COLUMNS.some((column) => giver.has(column));
}
