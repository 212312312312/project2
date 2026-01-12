import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Это тоже помогает решить проблему с global
    'global': 'window',
  },
  // Настройка для корректной работы WebSocket в dev-режиме, если будут проблемы с CORS
  server: {
    port: 5173,
  }
})