import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import process from 'node:process'

const apiProxyTarget = process.env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:5000'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
    // Performance improvements
    hmr: {
      overlay: false,
    },
  },
  build: {
    // Performance optimizations
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: 'esbuild',
    rollupOptions: {
      output: {
        // Code splitting for better caching
        manualChunks: {
          // Vendor chunk for stable dependencies
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Animation chunks
          animations: ['gsap'],
        },
      },
    },
    // Enable compression for faster asset loading
    reportCompressedSize: true,
    // Chunk size warning
    chunkSizeWarningLimit: 1000,
    // Source maps for debugging (disable in production if needed)
    sourcemap: true,
  },
  plugins: [
    tailwindcss(),
    react({
      // Faster React transforms
      babel: {
        plugins: [],
      },
    }),
    VitePWA({
      registerType: 'prompt', // Changed to prompt for better UX
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        id: '/',
        name: 'EquiClass - Faculty Coverage Ledger',
        short_name: 'EquiClass',
        description: 'Faculty coverage ledger for transparent, low-friction class handoffs.',
        theme_color: '#234542',
        background_color: '#f6f1e8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/icons/icon-512.svg',
            'purpose': 'any maskable',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
        screenshots: [
          {
            src: '/screenshots/desktop.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
          },
        ],
        shortcuts: [
          {
            name: 'New Request',
            short_name: 'New',
            description: 'Create a new substitute request',
            url: '/dashboard',
            icons: [{ src: '/icons/shortcuts/new.svg', sizes: '96x96' }],
          },
          {
            name: 'My Routine',
            short_name: 'Routine',
            description: 'View and edit your weekly routine',
            url: '/routine',
            icons: [{ src: '/icons/shortcuts/routine.svg', sizes: '96x96' }],
          },
        ],
        categories: ['productivity', 'education'],
        lang: 'en',
        dir: 'ltr',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false, // Let user control updates
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'script' || request.destination === 'style',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries  : 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
              },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              backgroundSync: {
                name: 'api-sync',
                options: {
                  maxRetentionTime: 24 * 60, // 24 hours
                },
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Disable in dev to test PWA
      },
    }),
  ],
  optimizeDeps: {
    include: ['react', 'react-dom', 'gsap', '@vercel/analytics/react'],
    exclude: [],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': '/src',
    },
  },
})
