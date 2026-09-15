import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { DEVIL_STATS_PATH } from './config'

export interface GenerationStats {
  attempts: number
  successes: number
  failures: number
  failuresByReason: Record<string, number>
  lastFailureAt: string | null
  updatedAt: string
}

const EMPTY_STATS: GenerationStats = {
  attempts: 0,
  successes: 0,
  failures: 0,
  failuresByReason: {},
  lastFailureAt: null,
  updatedAt: ''
}

export async function readGenerationStats(): Promise<GenerationStats> {
  try {
    const rawText = await readFile(DEVIL_STATS_PATH, 'utf8')
    const parsed = JSON.parse(rawText) as Partial<GenerationStats>
    return {
      attempts: parsed.attempts ?? 0,
      successes: parsed.successes ?? 0,
      failures: parsed.failures ?? 0,
      failuresByReason: parsed.failuresByReason ?? {},
      lastFailureAt: parsed.lastFailureAt ?? null,
      updatedAt: parsed.updatedAt ?? ''
    }
  } catch {
    return { ...EMPTY_STATS, failuresByReason: {} }
  }
}

// Serialise writes so overlapping generations cannot clobber each other's counts.
let writeQueue: Promise<void> = Promise.resolve()

function mutateStats(mutate: (stats: GenerationStats) => void): Promise<void> {
  writeQueue = writeQueue
    .then(async () => {
      const stats = await readGenerationStats()
      mutate(stats)
      stats.updatedAt = new Date().toISOString()
      await mkdir(dirname(DEVIL_STATS_PATH), { recursive: true })
      await writeFile(DEVIL_STATS_PATH, JSON.stringify(stats, null, 2), 'utf8')
    })
    .catch((error) => {
      console.error('generationTelemetry: write failed', error)
    })
  return writeQueue
}

export function recordGenerationAttempt(): Promise<void> {
  return mutateStats((stats) => {
    stats.attempts += 1
  })
}

export function recordGenerationSuccess(): Promise<void> {
  return mutateStats((stats) => {
    stats.successes += 1
  })
}

export function recordGenerationFailure(reason: string): Promise<void> {
  return mutateStats((stats) => {
    stats.failures += 1
    stats.failuresByReason[reason] = (stats.failuresByReason[reason] ?? 0) + 1
    stats.lastFailureAt = new Date().toISOString()
  })
}
