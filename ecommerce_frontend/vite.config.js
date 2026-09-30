import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react({
    babel: {
      plugins: [['babel-plugin-react-compiler', { target: '19' }]],
    },
  })],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000'
      },
      '/media': {
        target: 'http://127.0.0.1:8000'
      },
      '/images': {
        target: 'http://127.0.0.1:8000',
        rewrite: (path) => path.replace(/^\/images/, '/media')
      }
    }
  }
})
