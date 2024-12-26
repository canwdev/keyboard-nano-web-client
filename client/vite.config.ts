import {fileURLToPath, URL} from 'node:url'

import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 3002,
    proxy: {
      '/dev_api': {
        target: 'http://127.0.0.1:3300',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dev_api/, ''),
        ws: true,
      },
    },
  },
  plugins: [
    vue(),
    AutoImport({
      dts: './src/auto-import.d.ts',
      imports: [
        'vue',
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
