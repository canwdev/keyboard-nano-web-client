import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import {viteSingleFile} from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  build: {
    outDir: '../server/dist-frontend',
  },
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
      imports: ['vue'],
    }),
    viteSingleFile(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
