import { useRegisterSW } from 'virtual:pwa-register/react';
import { t } from '../../strings/id.js';

/**
 * `registerType: 'prompt'`, so a new build never swaps itself in underneath a
 * half-finished sale. The shopkeeper decides when to reload.
 */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="banner" role="status">
      <span className="spacer">{t.update.tersedia}</span>
      <button className="btn" onClick={() => setNeedRefresh(false)}>
        {t.update.nanti}
      </button>
      <button className="btn btn--primary" onClick={() => updateServiceWorker(true)}>
        {t.update.muat}
      </button>
    </div>
  );
}
