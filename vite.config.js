import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));

// GitHub Pages serves a project site at /<repo>/, never at the domain root.
// This must match the repo name exactly, with both slashes: the repo is
// `dagank`, so the site lives at https://arlian.github.io/dagank/. Get this
// wrong and every asset 404s against a blank page.
const BASE = process.env.KASIR_BASE ?? '/dagank/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    // The camera, and installing the PWA, both need a secure context. That is
    // free on localhost but not over the LAN, so testing barcode scanning on a
    // real phone needs `npm run dev:https`. Self-signed, so the phone will ask
    // once whether to trust it.
    ...(process.env.KASIR_HTTPS ? [basicSsl()] : []),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon-maskable.png'],
      manifest: {
        name: 'Kasir UMKM',
        short_name: 'Kasir',
        description: 'Kasir sederhana untuk usaha kecil. Jalan tanpa internet.',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#05833d',
        lang: 'id',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // The fallback barcode decoder is deliberately NOT precached. Chrome
        // on Android decodes natively and would otherwise pay a few hundred KB
        // at install for a file it never loads. Browsers that do need it fetch
        // it once, online, and it is cached from then on.
        globIgnores: ['**/pemindai-*.js'],
        runtimeCaching: [
          {
            urlPattern: /\/pemindai-[\w-]+\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pemindai',
              expiration: { maxEntries: 2 },
            },
          },
        ],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Give the fallback decoder a stable name so the service worker can
        // single it out and keep it off the precache list.
        manualChunks: (id) => (id.includes('@zxing') ? 'pemindai' : undefined),
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
