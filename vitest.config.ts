import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    env: {
      DEVIL_DATA_DIRECTORY: './.data/test-sessions',
      DEVIL_STATS_PATH: './.data/test-generation-stats.json'
    }
  }
})
