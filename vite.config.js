import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false, // Never expose source maps in production
  },
  server: {
    proxy: {
      '/api/help-centre': {
        target: 'https://es_search.jackyzhang.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/help-centre/, '/api/v1/help-centre'),
      },
      '/socket.io': {
        target: 'http://localhost:3100',
        ws: true,
      },
    },
  },
})
