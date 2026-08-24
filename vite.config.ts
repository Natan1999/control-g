import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

const isNativeBuild = process.env.VITE_NATIVE_BUILD === 'true'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Capacitor already bundles the complete application. Registering the
      // web PWA worker inside Android can keep an older app shell after an APK
      // update, so native builds deliberately omit the registration script.
      injectRegister: isNativeBuild ? null : 'auto',
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'og-image.png'],
      manifest: {
        name: 'Control G',
        short_name: 'ControlG',
        description: 'Caracterizaciones, encuestas y levantamiento de información en campo con funcionamiento offline',
        theme_color: '#1B3A4B',
        background_color: '#1B3A4B',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache app shell (HTML, JS, CSS)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Runtime caching strategies
        runtimeCaching: [
          {
            // Supabase reads get a short network-first cache. Field records and
            // mutations are persisted separately in IndexedDB by the sync engine.
            urlPattern: /https:\/\/controlg2\.dran\.cloud\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'control-g-supabase-read-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts and other external assets
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Skip waiting and claim clients immediately on update
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false, // disable in dev to avoid HMR conflicts
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
