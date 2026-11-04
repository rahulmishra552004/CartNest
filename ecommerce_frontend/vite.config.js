import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.BACKEND_URL || 'http://127.0.0.1:8000';

  return {
    plugins: [react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
    })],
    server: {
      proxy: {
        '/api': {
          target: backend
        },
        '/media': {
          target: backend
        },
        '/images': {
          target: backend,
          rewrite: (path) => path.replace(/^\/images/, '/media')
        },
      },
    },
  }
})
