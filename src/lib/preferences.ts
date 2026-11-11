export type AppPrefs = {
  /** Fill title, photo, and price from a shop link. Default on. */
  autofill: boolean;
  introSeen: boolean;
  sampleDismissed: boolean;
};

const KEY = 'meantvo.prefs.v1';

export const DEFAULT_PREFS: AppPrefs = {
  autofill: true,
  introSeen: false,
  sampleDismissed: false,
};

type Memory = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

let memory = '';

const memoryStore: Memory = {
  getItem: () => memory || null,
  setItem: (_key, value) => {
    memory = value;
  },
};

function browserStore(): Memory | null {
  if (typeof globalThis.localStorage === 'undefined') return null;
  return globalThis.localStorage;
}

export function readAppPrefs(store: Memory | null = browserStore() ?? memoryStore): AppPrefs {
  try {
    const raw = store?.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<AppPrefs>;
    return {
      autofill: parsed.autofill !== false,
      introSeen: parsed.introSeen === true,
      sampleDismissed: parsed.sampleDismissed === true,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function writeAppPrefs(patch: Partial<AppPrefs>, store: Memory | null = browserStore() ?? memoryStore): AppPrefs {
  const next = { ...readAppPrefs(store), ...patch };
  store?.setItem(KEY, JSON.stringify(next));
  return next;
}

/** Test helper. */
export function resetMemoryPrefs() {
  memory = '';
}
