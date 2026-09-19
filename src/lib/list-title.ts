type OwnerName = {
  owner_display_name?: string | null;
  owner_handle?: string | null;
};

/** First name, else handle — never a full dual-name chrome dump. */
export function personFirstLabel(displayName?: string | null, handle?: string | null) {
  const first = (displayName ?? '').trim().split(/\s+/)[0];
  if (first) return first;
  const slug = (handle ?? '').trim().replace(/^@/, '');
  return slug || null;
}

export function possessiveName(name: string) {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

/** Giver chrome: “Kiri’s list” / “jordan’s list”. */
export function personListTitle(displayName?: string | null, handle?: string | null) {
  const label = personFirstLabel(displayName, handle);
  return label ? `${possessiveName(label)} list` : 'Their list';
}

export function giverListTitle(
  meta?: OwnerName | null,
  opts?: { loading?: boolean; unmatched?: boolean },
) {
  if (opts?.unmatched) return 'Shared wishlist';
  if (!meta) return opts?.loading ? 'Opening list…' : 'Their list';
  return personListTitle(meta.owner_display_name, meta.owner_handle);
}
