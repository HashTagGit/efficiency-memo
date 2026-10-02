import { defineConfig } from 'vitest/config'

// Local-time fixtures use UTC+08:00; keep them deterministic on every runner.
process.env.TZ = 'Asia/Shanghai'

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**'],
    globals: true,
  },
})
