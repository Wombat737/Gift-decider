let pendingId: string | null = null;

export function queuePickPulse(itemId: string) {
  const id = itemId.trim();
  pendingId = id || null;
}

export function peekPickPulse() {
  return pendingId;
}

export function clearPickPulse(itemId?: string) {
  if (!itemId || pendingId === itemId) pendingId = null;
}

export function resetPickPulse() {
  pendingId = null;
}
