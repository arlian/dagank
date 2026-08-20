import { useCallback, useEffect, useState } from 'react';
import { loadSettings } from '../data/settings.js';
import { requestDurableStorage } from '../data/db.js';
import { SettingsProvider } from './settings-context.jsx';
import { useHashRoute } from './useHashRoute.js';
import UpdatePrompt from './components/UpdatePrompt.jsx';
import Onboarding from './screens/Onboarding.jsx';
import TabBar from './components/TabBar.jsx';
import Kasir from './screens/Kasir.jsx';
import Barang from './screens/Barang.jsx';
import Utang from './screens/Utang.jsx';
import Laporan from './screens/Laporan.jsx';
import Pengaturan from './screens/Pengaturan.jsx';

export default function App() {
  const [settings, setSettings] = useState(null);
  const [route] = useHashRoute();

  const refresh = useCallback(async () => {
    setSettings(await loadSettings());
  }, []);

  useEffect(() => {
    refresh();
    // Ask once, at startup, so the browser is less likely to evict the shop's
    // entire history under storage pressure.
    requestDurableStorage();
  }, [refresh]);

  // Nothing to show before the first read; it is local and takes a few ms, so
  // a spinner here would only flash.
  if (!settings) return null;

  if (!settings.onboarded) {
    return (
      <SettingsProvider value={{ settings, refresh }}>
        <Onboarding onDone={refresh} />
      </SettingsProvider>
    );
  }

  const screens = {
    kasir: Kasir,
    barang: Barang,
    utang: settings.features.utang ? Utang : Kasir,
    laporan: Laporan,
    atur: Pengaturan,
  };
  const Screen = screens[route] ?? Kasir;

  return (
    <SettingsProvider value={{ settings, refresh }}>
      <UpdatePrompt />
      <Screen />
      <TabBar route={route} />
    </SettingsProvider>
  );
}
