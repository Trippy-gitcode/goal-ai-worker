import { defineConfig } from 'vite'

export default defineConfig({
  root: 'frontend',
  base: '/',
  publicDir: 'public',
  build: {
    outDir: '../frontend-dist',
    emptyOutDir: true,
    minify: 'esbuild',
    modulePreload: false,
    rollupOptions: {
      input: {
        main: 'index.html',
        lp: 'lp.html',
        terms: 'terms.html',
        privacy: 'privacy.html'
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'https://goal-ai-worker.goalai-futoshi.workers.dev',
        changeOrigin: true,
        secure: true
      }
    }
  }
})
