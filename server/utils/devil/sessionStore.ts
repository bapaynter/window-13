import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Instrument } from './instrumentSchema'
import type { PersonalityKey } from './personalityGuard'
import type { NegotiationActionRecord, Outcome, SessionMeters } from './meters'
import type { FinalRecord } from './instrumentRecord'
import { DEVIL_DATA_DIRECTORY } from './config'

export interface SessionRecord {
  sessionIdentifier: string
  personalityKey: PersonalityKey
  wish: string
  templateIdentifier: string
  instrument: Instrument
  actionRecords: NegotiationActionRecord[]
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
  processingFee: number
  burden: number
}

async function ensureDataDirectory(): Promise<void> {
  await mkdir(DEVIL_DATA_DIRECTORY, { recursive: true })
}

function buildSessionPath(sessionIdentifier: string): string {
  return join(DEVIL_DATA_DIRECTORY, `${sessionIdentifier}.json`)
}

export function createSession(
  wish: string,
  personalityKey: PersonalityKey,
  templateIdentifier: string,
  instrument: Instrument
): SessionRecord {
  const timestamp = new Date().toISOString()
  return {
    sessionIdentifier: randomUUID(),
    personalityKey,
    wish,
    templateIdentifier,
    instrument,
    actionRecords: [],
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

export async function saveSession(record: SessionRecord): Promise<void> {
  await ensureDataDirectory()
  const updatedRecord: SessionRecord = { ...record, updatedAt: new Date().toISOString() }
  await writeFile(buildSessionPath(record.sessionIdentifier), JSON.stringify(updatedRecord, null, 2), 'utf8')
}

export async function loadSession(sessionIdentifier: string): Promise<SessionRecord | null> {
  try {
    const rawText = await readFile(buildSessionPath(sessionIdentifier), 'utf8')
    const parsed = JSON.parse(rawText) as SessionRecord
    // Filings written before the instrument redesign cannot be replayed.
    if (parsed.instrument === undefined || parsed.templateIdentifier === undefined) {
      return null
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
      processingFee: record.finalMeters?.processingFee ?? 0,
      burden: record.finalMeters?.burden ?? 0
    }))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}
