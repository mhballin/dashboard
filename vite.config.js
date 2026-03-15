import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxyTarget = (globalThis.process?.env?.VITE_API_PROXY_TARGET || '').trim()

if (!apiProxyTarget) {
  throw new Error('Missing required environment variable: VITE_API_PROXY_TARGET')
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
