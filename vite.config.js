import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Эта настройка работает ТОЛЬКО в режиме разработки (npm run dev)
    // Она спасает от белого экрана на ПК
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // Куда перенаправлять запросы
        changeOrigin: true,
        secure: false,
      },
      '/ws-taxi': {
        target: 'http://localhost:8080', // Для Веб-сокетов
        ws: true,
        changeOrigin: true
      }
    }
  }
})