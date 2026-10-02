import type { ItemKind } from '@/lib/types';

/** Exact already means no substitutes. Taste keeps the separate lock. */
export function noSubstitutionForSave(itemKind: ItemKind, noSubstitution: boolean) {
  return itemKind === 'exact' ? true : noSubstitution;
}
