import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const rootDirectory = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = path.resolve(rootDirectory, '../..')

export default defineConfig({
  plugins: [react() as any],
  resolve: {
    alias: {
      '@': path.resolve(rootDirectory, './src'),
      '@memo/shared': path.resolve(repoRoot, 'packages/shared/src'),
      '@memo/shared/': path.resolve(repoRoot, 'packages/shared/src/'),
      '@memo/ui': path.resolve(repoRoot, 'packages/ui/src'),
      '@memo/ui/': path.resolve(repoRoot, 'packages/ui/src/'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/lib/supabase/__tests__/setup.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
})