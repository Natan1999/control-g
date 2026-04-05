import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Control G',
        short_name: 'ControlG',
        description: 'Gestión de programas de atención psicosocial a familias',
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
            // Cache Appwrite API responses for families (offline read)
            urlPattern: /https:\/\/.*appwrite.*\/databases\/.*\/families.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'appwrite-families',
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache Appwrite user profiles
            urlPattern: /https:\/\/.*appwrite.*\/databases\/.*\/user_profiles.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'appwrite-profiles',
              expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache Appwrite municipalities
            urlPattern: /https:\/\/.*appwrite.*\/databases\/.*\/entity_municipalities.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'appwrite-municipalities',
              expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
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
