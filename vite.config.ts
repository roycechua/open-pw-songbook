import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  server: {
    host: true,
    port: 3000,
  },
  plugins: [tanstackStart(), viteReact()],
})

export default config
