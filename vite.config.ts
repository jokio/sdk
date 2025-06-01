import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: 'test',
  server: {
    open: '/index.html', // or 'test/index.html' if kept in /test
  },

  build: {
    modulePreload: false,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: '@jokio/sdk',
      fileName: format => `jokio.sdk.${format}.js`,
    },
  },

  plugins: [
    {
      name: 'replace-crypto',
      generateBundle(options, bundle) {
        Object.keys(bundle).forEach(fileName => {
          const chunk = bundle[fileName]
          if (chunk.type === 'chunk') {
            chunk.code = chunk.code.replace(
              /[a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*require\(["']crypto["']\)/g,
              'crypto = window.crypto || globalThis.crypto',
            )
            chunk.code = chunk.code.replace(
              /require\(["']crypto["']\)/g,
              '(window.crypto || globalThis.crypto)',
            )
          }
        })
      },
    },
  ],
})
