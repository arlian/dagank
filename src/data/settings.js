// Shop settings and feature flags. Held in `meta` under one key so the whole
// object can be read once at startup and passed down.

import { db, getMeta, setMeta } from './db.js';
import { featuresFor, normaliseFeatures, PRESETS } from '../profiles/index.js';

const KEY = 'settings';

export const DEFAULT_SETTINGS = {
  namaUsaha: '',
  // Printed in the struk header. Optional: a gorengan cart has neither.
  alamat: '',
  telepon: '',
  profile: null,
  features: normaliseFeatures(),
  rounding: 'none',
  // A data URL of the shop's static QRIS, shown full screen at payment. Kept
  // in settings rather than a table because there is exactly one, and keeping
  // it a string means it survives a backup export unchanged.
  qris: null,
  // Off by default: sending the kick to a printer with no drawer wired to it
  // is harmless but pointless.
  laciUang: false,
  onboarded: false,
};

export async function loadSettings() {
  const stored = await getMeta(KEY);
  if (!stored) return DEFAULT_SETTINGS;
  // Merge over the defaults so a shop upgrading into a build with a new flag
  // gets it off rather than undefined.
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    features: normaliseFeatures(stored.features),
  };
}

export async function saveSettings(patch) {
  const current = await loadSettings();
  const next = { ...current, ...patch };
  await setMeta(KEY, next);
  return next;
}

export async function setFeature(flag, value) {
  const current = await loadSettings();
  return saveSettings({ features: { ...current.features, [flag]: value } });
}

/**
 * Applied once, at onboarding. Never call this on update: the flags belong to
 * the shop after the first run, and re-applying would overwrite a deliberate
 * choice.
 */
export async function applyPreset(profile, namaUsaha) {
  if (!PRESETS[profile]) throw new Error(`Unknown profile: ${profile}`);
  return saveSettings({
    profile,
    namaUsaha: namaUsaha?.trim() ?? '',
    features: featuresFor(profile),
    onboarded: true,
  });
}

export const listCategories = async () => {
  const settings = await loadSettings();
  const seeded = PRESETS[settings.profile]?.seedCategories ?? [];
  const used = await db.items.orderBy('category').uniqueKeys();
  return [...new Set([...seeded, ...used.filter(Boolean)])];
};
