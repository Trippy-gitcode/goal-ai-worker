import { defineConfig } from 'vite'

export default defineConfig({
  root: 'frontend',
  build: {
    outDir: '../frontend-dist',
    emptyOutDir: true,
    minify: false,
    modulePreload: false,
  },
  server: { port: 3000 }
})
