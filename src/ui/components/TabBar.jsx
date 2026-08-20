import { t, noun } from '../../strings/id.js';
import { navigate } from '../useHashRoute.js';
import { useSettings } from '../settings-context.jsx';
import { ICONS } from './icons.jsx';

// Icons always carry a text label. An icon-only button is guesswork for
// someone who has never used software of this kind.
export default function TabBar({ route }) {
  const { settings } = useSettings();
  const words = noun(settings.profile);

  const tabs = [
    { key: 'kasir', label: t.tab.kasir },
    { key: 'barang', label: capitalise(words.satu) },
    ...(settings.features.utang ? [{ key: 'utang', label: t.tab.utang }] : []),
    { key: 'laporan', label: t.tab.laporan },
    { key: 'atur', label: t.tab.pengaturan },
  ];

  return (
    <nav className="tabbar">
      {tabs.map((tab) => {
        const Icon = ICONS[tab.key];
        return (
          <button
            key={tab.key}
            className="tabbar__item"
            aria-current={route === tab.key ? 'page' : undefined}
            onClick={() => navigate(tab.key)}
          >
            <Icon className="tabbar__icon" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);
