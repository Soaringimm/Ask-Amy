import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false, // Never expose source maps in production
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return null
          // Keep React runtime stack together to avoid cross-chunk init cycles.
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('/scheduler/')) return 'react-vendor'
          if (id.includes('react-router')) return 'router-vendor'
          if (id.includes('@tanstack/react-query')) return 'query-vendor'
          if (id.includes('@supabase/')) return 'supabase-vendor'
          if (id.includes('react-markdown') || id.includes('remark-') || id.includes('rehype-') || id.includes('react-syntax-highlighter')) return 'markdown-vendor'
          if (id.includes('date-fns')) return 'date-vendor'
          if (id.includes('@calcom/embed-react')) return 'calcom-vendor'
          return 'vendor'
        },
      },
    },
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
