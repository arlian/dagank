---
name: pwa-offline
description: Making the app installable and fully usable offline as a PWA hosted on GitHub Pages, covering the manifest, service worker, caching strategy, update prompts, storage durability, and iOS limitations. Use this whenever touching the service worker, manifest, build config, routing, deployment, install prompts, app updates, or any bug reported as "the app shows an old version" or "it does not work without internet". Trigger it before changing build or hosting configuration, since a subpath deployment and a wrong cache strategy will strand users on a stale build with no way to reach them.
---

# PWA, offline, and deployment

The app is a static site on GitHub Pages that must install to the home screen and work with the network completely off. There is no server, so there is no API to fall back to and no way to push a fix to a user who is stuck. That last point drives most of what follows: **the update path is the highest-risk part of this app**, higher risk than any feature.

## Hosting on a subpath

GitHub Pages serves a project site at `https://user.github.io/repo/`, not at a domain root. Three things break if this is ignored:

```js
// vite.config.js
export default {
  base: '/kasir/',   // must match the repo name, with both slashes
};
```

- The manifest `start_url` and `scope` must both be the subpath, not `/`.
- The service worker file must be served from the subpath, which limits its scope to that subpath. This is correct and desirable here.
- **Use hash routing**, not history routing. GitHub Pages has no rewrite rules, so a deep link to `/kasir/laporan` returns 404 on a hard refresh. The common workaround of copying `index.html` to `404.html` sort of works but interacts badly with the service worker. Hash routing sidesteps the whole class of problem and costs nothing in an app nobody links into.

## Manifest

```json
{
  "name": "Kasir UMKM",
  "short_name": "Kasir",
  "start_url": "/kasir/",
  "scope": "/kasir/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#0f766e",
  "lang": "id",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Include the maskable icon. Without it Android renders a shrunken icon inside a white circle, which looks broken and cheap on the home screen of someone deciding whether to trust this thing with their sales data.

## Caching strategy

There is no dynamic content, which makes this simple. Precache the entire build output and serve it cache-first. Nothing needs a network-first strategy because nothing comes from the network.

Use `vite-plugin-pwa` with Workbox rather than hand-writing a service worker, and configure it to prompt rather than auto-update:

```js
VitePWA({
  registerType: 'prompt',
  workbox: {
    globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,
  },
})
```

Never cache with a strategy that requires the network to succeed first. A cashier in a shop with no signal must get a full app shell instantly, every time.

## The update flow

`registerType: 'prompt'` means a new build waits until the user accepts. That is the right default for a POS, because auto-reloading mid-transaction would lose a sale in progress.

```js
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    showBanner('Versi baru tersedia', 'Muat ulang', () => updateSW(true));
  },
  onOfflineReady() {
    showToast('Siap dipakai tanpa internet');
  },
});
```

Rules for updates:

- Never call `skipWaiting()` unprompted while a sale is open. Gate the prompt on the till being idle, or show it but let the cashier defer.
- Ship a visible version string in Pengaturan (`__APP_VERSION__` injected at build). When a shopkeeper reports a bug over WhatsApp, the first question is which version, and they need to be able to read it off the screen.
- Never ship a change that requires a coordinated data and code update in the same release without the migration being backward-tolerant. Some devices will run the old code against a new database or the reverse.
- Test the update path on every release: load the old build, deploy the new one, confirm the prompt appears and that data survives the reload. This is the one test that must never be skipped.

## Storage durability

IndexedDB can be evicted under storage pressure. The shop's entire sales history lives there, so ask for durable storage as soon as the user has done something meaningful, not on first paint:

```js
export async function requestDurableStorage() {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}
```

Chrome on Android grants this more readily once the app is installed to the home screen, so ask after install rather than before.

Also surface usage in the diagnostics screen:

```js
const { usage, quota } = await navigator.storage.estimate();
```

## iOS caveats

- No Web Bluetooth, so no direct printing. See the escpos-receipt skill for the fallback.
- Safari evicts site data after roughly seven days of no interaction. **A PWA added to the home screen is treated differently and is far safer than a tab**, so on iOS the install prompt is not a nicety, it is data protection. Make the install instructions explicit and unmissable for iOS users, since iOS has no `beforeinstallprompt` event and the Share then "Add to Home Screen" flow has to be explained with pictures.
- Given eviction risk, push the export reminder harder on iOS.

## Install prompt on Android

```js
let deferred = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  showInstallButton();
});

async function install() {
  if (!deferred) return;
  deferred.prompt();
  await deferred.userChoice;
  deferred = null;
}
```

Do not fire this on first load. Let the shopkeeper add a few items first, then offer installation once the app has demonstrably done something for them.

## Deployment

A GitHub Actions workflow building to `dist/` and publishing to Pages is enough. Two things to get right:

- Set a real `Cache-Control` expectation in your head: Pages caches `index.html` briefly, hashed assets forever. Since the service worker is what actually controls versions, make sure `sw.js` itself is never long-cached, or updates will not be discovered.
- Tag releases and keep old builds reachable, so a broken release can be reverted quickly and a user can be walked back to a working version.

## Self-check

- Does `base` match the repo name and the manifest `scope`?
- Does a hard refresh on a deep link still work?
- Does the app load with devtools set to offline, from a cold start?
- Does the update prompt appear, and does data survive it?
- Is the version string visible in the settings screen?
- Has durable storage been requested?
