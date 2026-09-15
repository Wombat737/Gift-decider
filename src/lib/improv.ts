import { giverConfidence as baseConfidence } from '@/lib/confidence';
import { inspectBuyLink } from '@/lib/link-health';
import { suggestSubstitutes } from '@/lib/substitutes';
import type { GiftSubstitute, GiverConfidence, WishlistItem } from '@/lib/types';

function vibeClause(item: WishlistItem) {
  if (item.tags.length === 0) return '';
  return ` Vibes: ${item.tags.slice(0, 4).join(' · ')}.`;
}

/** Giver-only. Adds vibe colour and dead-link context to the heuristic score. */
export function improvisedConfidence(item: WishlistItem): GiverConfidence {
  const base = baseConfidence(item);
  const health = inspectBuyLink(item);
  let reason = base.reason + vibeClause(item);

  if (health === 'dead' && item.no_substitution) {
    reason += ' Buy link looks dead — substitutions stay locked; no alternatives.';
    return { ...base, level: base.level === 'safe' ? 'bold' : base.level, label: base.level === 'safe' ? 'Bold' : base.label, reason };
  }
  if (health === 'dead') {
    reason += ' Buy link looks dead — try the vibe-matched alternatives.';
    return {
      ...base,
      level: base.level === 'needs-size' ? 'needs-size' : 'bold',
      label: base.level === 'needs-size' ? base.label : 'Bold',
      reason,
    };
  }
  if (health === 'missing' && !item.no_substitution) {
    reason += ' No buy link — vibe-close hunts are OK.';
  }

  return { ...base, reason };
}

export function improvisedSubstitutes(item: WishlistItem): GiftSubstitute[] {
  return suggestSubstitutes(item);
}
