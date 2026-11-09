import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendPort = env.BACKEND_PORT || '8000'
  if (Boolean(env.HTTPS_KEY_FILE) !== Boolean(env.HTTPS_CERT_FILE)) {
    throw new Error(
      'Configure HTTPS_KEY_FILE e HTTPS_CERT_FILE juntos para habilitar HTTPS.',
    )
  }
  const httpsOptions =
    env.HTTPS_KEY_FILE && env.HTTPS_CERT_FILE
      ? {
          key: readFileSync(resolve(process.cwd(), env.HTTPS_KEY_FILE)),
          cert: readFileSync(resolve(process.cwd(), env.HTTPS_CERT_FILE)),
        }
      : undefined
  const apiProxy = {
    '/api': {
      target: `http://127.0.0.1:${backendPort}`,
      changeOrigin: true,
    },
  }

  return {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'ATLAS — Gestão doméstica de sobrevivência e emergências',
          short_name: 'ATLAS',
          description: 'Gestão doméstica de sobrevivência e emergências.',
          lang: 'pt-BR',
          display: 'standalone',
          theme_color: '#0E5A66',
          background_color: '#F2F5F4',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api/],
        },
      }),
    ],
    server: {
      proxy: apiProxy,
      ...(httpsOptions ? { https: httpsOptions } : {}),
    },
    preview: {
      proxy: apiProxy,
      ...(httpsOptions ? { https: httpsOptions } : {}),
    },
  }
})
