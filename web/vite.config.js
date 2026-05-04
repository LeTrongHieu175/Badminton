import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const railwayAllowedHosts = [
  'healthcheck.railway.app',
  process.env.RAILWAY_PUBLIC_DOMAIN,
].filter(Boolean)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT || 4173),
    strictPort: true,
    allowedHosts: railwayAllowedHosts
  }
})
