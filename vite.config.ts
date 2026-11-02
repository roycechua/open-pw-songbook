import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  server: {
    host: true,
    port: 3000,
    allowedHosts: [
      'localhost',
      '.ts.net', // all Tailscale MagicDNS names
      // or pin one host:
      // 'rcbeelinkminipc-ubuntu-wsl.tail3575ef.ts.net',
    ]
  },
  plugins: [tanstackStart(), viteReact()],
})

export default config
