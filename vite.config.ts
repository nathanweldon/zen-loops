import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // make the service worker register itself automatically
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      // allow testing service worker behavior during "npm run dev"
      devOptions: { enabled: true },
      workbox: {
        // what to cache for offline use
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
      },
      manifest: {
        name: 'Zen Loops',
        short_name: 'ZenLoops',
        description: 'A calm, lightweight puzzle you can chill with.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
})
