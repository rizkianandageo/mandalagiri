import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/mandalagiri/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['img/Mandalagiri.png', 'img/landing_bg.png', 'data/profile.json', 'data/jalur.geojson', 'data/poi.geojson'],
      manifest: {
        name: 'Mandalagiri 3D Explorer',
        short_name: 'Mandalagiri',
        description: 'Next-generation 3D interactive map for mountaineering adventures',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'fullscreen',
        icons: [
          {
            src: 'img/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'img/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,geojson}'],
        globIgnores: ['**/data/terrain/**', '**/img/poi/**'],
        maximumFileSizeToCacheInBytes: 10000000,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery\/MapServer\/tile\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'satellite-tiles-cache',
              expiration: {
                maxEntries: 10000,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/data\/terrain\/.*\.png$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'terrain-tiles-cache',
              expiration: {
                maxEntries: 10000,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/img\/poi\/.*\.(png|jpg|jpeg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'poi-images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
});
