import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: "test",
  server: {
    open: '/index.html' // or 'test/index.html' if kept in /test
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: '@jokio/sdk',
      fileName: format => `jokio.sdk.${format}.js`,
    },
    // rollupOptions: {
    //   output: {
    //     globals: {
    //       // Example: react: 'React'
    //     },
    //   },
    // },
  },
})
