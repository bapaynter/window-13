import { readGenerationStats } from '../../utils/devil/generationTelemetry'

export default defineEventHandler(async () => {
  const stats = await readGenerationStats()
  const successRate = stats.attempts > 0 ? stats.successes / stats.attempts : 0
  return { ...stats, successRate }
})
