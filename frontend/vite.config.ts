import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      external: ['./globalThis'],
      output: {
        manualChunks: {
          mapbox: ['mapbox-gl']
        }
      }
    },
    commonjsOptions: {
      ignore: ['sql.js']
    }
  },
  esbuild: {
    target: 'esnext',
    supported: {
      bigint: true
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
      supported: {
        bigint: true
      }
    }
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      fs: false,
      path: false,
      os: false,
      './globalThis': false,
      'sql.js': false,
    }
  }
})
