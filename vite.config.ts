import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Переменные окружения для Supabase
process.env.VITE_SUPABASE_URL = 'https://kzrafexlalajoirzugdj.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6cmFmZXhsYWxham9pcnp1Z2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3Mjk0MDMsImV4cCI6MjA2OTMwNTQwM30.rrKmafrLhQWNk7bIC5kfoO5pcvEkzO2i_THc5_Ep3nk'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8081,
    proxy: {
      '/wb-api': {
        target: 'https://wbx-auth.wildberries.ru',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/wb-api/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Add CORS headers
            proxyReq.setHeader('Origin', 'https://www.wildberries.ru')
            proxyReq.setHeader('Referer', 'https://www.wildberries.ru/')
          })
        }
      },
      '/wb-card': {
        target: 'https://card.wb.ru',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/wb-card/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Origin', 'https://www.wildberries.ru')
            proxyReq.setHeader('Referer', 'https://www.wildberries.ru/')
          })
        }
      },
      '/wb-cart': {
        target: 'https://cart-storage-api.wildberries.ru',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/wb-cart/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Origin', 'https://www.wildberries.ru')
            proxyReq.setHeader('Referer', 'https://www.wildberries.ru/')
          })
        }
      },
      '/wb-webapi': {
        target: 'https://www.wildberries.ru',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/wb-webapi/, '/webapi'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Origin', 'https://www.wildberries.ru')
            proxyReq.setHeader('Referer', 'https://www.wildberries.ru/')
          })
        }
      },
      '/wb-antibot': {
        target: 'https://antibot.wildberries.ru',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/wb-antibot/, '/api/v1'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Origin', 'https://www.wildberries.ru')
            proxyReq.setHeader('Referer', 'https://www.wildberries.ru/')
          })
        }
      }
    }
  }
});