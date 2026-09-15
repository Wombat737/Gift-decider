const DEMO_SESSION_KEY = 'giftdecider.demo-session';

export function isDemoSession() {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(DEMO_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeDemoSession(on: boolean) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (on) localStorage.setItem(DEMO_SESSION_KEY, '1');
    else localStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // ignore
  }
}

/** Demo data when Supabase env is missing, or the user tapped Explore demo. */
export function shouldUseDemoData(opts: { supabaseConfigured: boolean; demoSession: boolean }) {
  return !opts.supabaseConfigured || opts.demoSession;
}
