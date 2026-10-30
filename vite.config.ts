import react from '@vitejs/plugin-react'
import { unplugin as stylex } from '@stylexjs/unplugin'
import { defineConfig } from 'vite'

// Project Pages site: https://victorfern91.github.io/topo-builder/
// Local dev leaves this unset and serves from /.
const base = normalizeBase(process.env.VITE_BASE_PATH)

export default defineConfig({
  base,
  plugins: [
    stylex.vite({
      useCSSLayers: { before: ['base'] },
    }),
    react(),
  ],
  server: {
    host: '0.0.0.0',
    port: 24680,
    strictPort: true,
  },
})

function normalizeBase(value: string | undefined): string {
  if (!value || value === '/') return '/'
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash
    : `${withLeadingSlash}/`
}
