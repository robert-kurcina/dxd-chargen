export type AdminSettings = {
  randomSeed: number;
  randomSequence: number;
  libraryTags: string[];
};

export const ADMIN_SETTINGS_STORAGE_KEY = 'dxd-chargen-admin-settings-v1';
export const ADMIN_SETTINGS_EVENT = 'dxd-chargen-admin-settings-changed';

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  randomSeed: 2044,
  randomSequence: 0,
  libraryTags: [],
};

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .map((entry) => String(entry ?? '').trim())
    .filter(Boolean)))
    .slice(0, 64);
}

export function normalizeAdminSettings(value: unknown): AdminSettings {
  const candidate = value && typeof value === 'object' ? value as Partial<AdminSettings> : {};
  const randomSeed = Number.isFinite(Number(candidate.randomSeed)) ? Math.trunc(Number(candidate.randomSeed)) : DEFAULT_ADMIN_SETTINGS.randomSeed;
  const randomSequence = Number.isFinite(Number(candidate.randomSequence)) ? Math.max(0, Math.trunc(Number(candidate.randomSequence))) : 0;
  return { randomSeed, randomSequence, libraryTags: cleanTags(candidate.libraryTags) };
}

export function readAdminSettings(): AdminSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_ADMIN_SETTINGS };
  try {
    const raw = window.localStorage.getItem(ADMIN_SETTINGS_STORAGE_KEY);
    return raw ? normalizeAdminSettings(JSON.parse(raw)) : { ...DEFAULT_ADMIN_SETTINGS };
  } catch {
    return { ...DEFAULT_ADMIN_SETTINGS };
  }
}

export function writeAdminSettings(value: AdminSettings): AdminSettings {
  const normalized = normalizeAdminSettings(value);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ADMIN_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(ADMIN_SETTINGS_EVENT, { detail: normalized }));
  }
  return normalized;
}

// Mulberry32: compact deterministic PRNG suitable for repeatable game generation,
// not cryptographic work. The sequence position is persisted so every Forge random
// action consumes the same global stream until the administrator resets it.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function nextGlobalRandom(): number {
  if (typeof window === 'undefined') return Math.random();
  const settings = readAdminSettings();
  const mixedSeed = (settings.randomSeed ^ Math.imul(settings.randomSequence + 1, 0x9E3779B1)) >>> 0;
  const value = mulberry32(mixedSeed)();
  writeAdminSettings({ ...settings, randomSequence: settings.randomSequence + 1 });
  return value;
}

export function resetGlobalRandomSequence() {
  const settings = readAdminSettings();
  return writeAdminSettings({ ...settings, randomSequence: 0 });
}
