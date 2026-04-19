import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 25003,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: ['mbasic8.pikamc.vn'],
  },
})
