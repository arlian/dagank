import { createContext, useContext } from 'react';
import { DEFAULT_SETTINGS } from '../data/settings.js';

const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  refresh: async () => {},
});

export const SettingsProvider = SettingsContext.Provider;

export const useSettings = () => useContext(SettingsContext);

/** Read a single flag. Callers use this rather than reaching into settings. */
export const useFeature = (flag) => useSettings().settings.features[flag];
