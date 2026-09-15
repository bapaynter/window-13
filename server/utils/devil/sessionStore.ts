import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { Instrument } from './instrumentSchema'
import type { PersonalityKey } from './personalityGuard'
import type { NegotiationActionRecord, Outcome, SessionMeters } from './meters'
import type { FinalRecord } from './instrumentRecord'
import { DEVIL_DATA_DIRECTORY } from './config'

export type GenerationStatus = 'generating' | 'ready' | 'failed'

export interface SessionRecord {
  sessionIdentifier: string
  personalityKey: PersonalityKey
  wish: string
  templateIdentifier: string
  status: GenerationStatus
  generationError?: string
  instrument?: Instrument
  actionRecords: NegotiationActionRecord[]
  provisionTextOverrides: Record<string, string>
  createdAt: string
  updatedAt: string
  outcome?: Outcome
  noticeText?: string
  finalMeters?: SessionMeters
  finalRecord?: FinalRecord
}

export interface FilingSummary {
  sessionIdentifier: string
  wish: string
  outcome: Outcome
  createdAt: string
  assessment: number
}

async function ensureDataDirectory(): Promise<void> {
  await mkdir(DEVIL_DATA_DIRECTORY, { recursive: true })
}

function buildSessionPath(sessionIdentifier: string): string {
  return join(DEVIL_DATA_DIRECTORY, `${sessionIdentifier}.json`)
}

export function createSessionWithIdentifier(
  sessionIdentifier: string,
  wish: string,
  personalityKey: PersonalityKey,
  templateIdentifier: string
): SessionRecord {
  const timestamp = new Date().toISOString()
  return {
    sessionIdentifier,
    personalityKey,
    wish,
    templateIdentifier,
    status: 'generating',
    actionRecords: [],
    provisionTextOverrides: {},
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

export async function saveSession(record: SessionRecord): Promise<void> {
  await ensureDataDirectory()
  const updatedRecord: SessionRecord = { ...record, updatedAt: new Date().toISOString() }
  await writeFile(buildSessionPath(record.sessionIdentifier), JSON.stringify(updatedRecord, null, 2), 'utf8')
}

export async function markGenerationReady(sessionIdentifier: string, instrument: Instrument): Promise<void> {
  const session = await loadSession(sessionIdentifier)
  if (session === null) {
    return
  }
  await saveSession({ ...session, instrument, status: 'ready', generationError: undefined })
}

export async function markGenerationFailed(sessionIdentifier: string, message: string): Promise<void> {
  const session = await loadSession(sessionIdentifier)
  if (session === null) {
    return
  }
  await saveSession({ ...session, status: 'failed', generationError: message })
}

export async function loadSession(sessionIdentifier: string): Promise<SessionRecord | null> {
  try {
    const rawText = await readFile(buildSessionPath(sessionIdentifier), 'utf8')
    const parsed = JSON.parse(rawText) as SessionRecord
    // Filings written before the instrument redesign cannot be replayed.
    if (parsed.templateIdentifier === undefined) {
      return null
    }
    if (parsed.status === undefined) {
      parsed.status = parsed.instrument === undefined ? 'generating' : 'ready'
    }
    if (parsed.provisionTextOverrides === undefined) {
      parsed.provisionTextOverrides = {}
    }
    return parsed
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null
    }
    throw error
  }
}

export async function listFilings(): Promise<FilingSummary[]> {
  await ensureDataDirectory()
  const fileNames = await readdir(DEVIL_DATA_DIRECTORY)
  const records = await Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith('.json'))
      .map(async (fileName) => {
        try {
          const rawText = await readFile(join(DEVIL_DATA_DIRECTORY, fileName), 'utf8')
          const parsed = JSON.parse(rawText) as SessionRecord
          return parsed.templateIdentifier === undefined ? null : parsed
        } catch {
          return null
        }
      })
  )

  return records
    .filter((record): record is SessionRecord => record !== null && record.outcome !== undefined)
    .map((record) => ({
      sessionIdentifier: record.sessionIdentifier,
      wish: record.wish,
      outcome: record.outcome as Outcome,
      createdAt: record.createdAt,
      assessment: record.finalMeters?.assessment ?? 0
    }))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export async function removeSession(sessionIdentifier: string): Promise<void> {
  await rm(buildSessionPath(sessionIdentifier), { force: true })
}
