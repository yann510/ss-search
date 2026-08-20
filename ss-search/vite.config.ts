/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'

export default defineConfig({
  cacheDir: '../node_modules/.vite/ss-search',

  plugins: [nxViteTsPaths()],

  test: {
    reporters: ['default'],
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
})
