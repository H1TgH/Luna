import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,

    allowedHosts: [
      'luna-sc.ru',
      'www.luna-sc.ru'
    ],

    watch: {
      usePolling: true,
    },

    proxy: {
      '/api': {
        target: 'http://fastapi_app:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://minio:9000',
        changeOrigin: true,
      },
    },
  },
})