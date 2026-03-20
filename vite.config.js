import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rawApiProxyTarget = (globalThis.process?.env?.VITE_API_PROXY_TARGET || '').trim()
const localFallbackProxyTarget = 'http://127.0.0.1:3001'
const apiProxyTarget = rawApiProxyTarget || localFallbackProxyTarget
if (!rawApiProxyTarget) {
  console.warn(
    `[vite] VITE_API_PROXY_TARGET is not set. Falling back to ${localFallbackProxyTarget} for local use.`
  )
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': apiProxyTarget,
      '/api': apiProxyTarget,
      '/health': apiProxyTarget,
    },
  },
})
