import { defineConfig } from '@rsbuild/core';
import { pluginVue } from '@rsbuild/plugin-vue';
import {pluginSass} from "@rsbuild/plugin-sass";

export default defineConfig({
  plugins: [pluginVue(),pluginSass()],
  resolve: {
    alias: {
      '@': './src',
    },
  },
  server: {
    port: 3002,
    proxy: {
      '/dev_api': {
        target: 'http://localhost:3300',
        pathRewrite: { '^/dev_api': '' },
      },
    },
  },
});
