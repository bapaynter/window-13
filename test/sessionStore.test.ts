import { describe, it, expect, beforeAll } from 'vitest'
import { rm } from 'node:fs/promises'
import { DEVIL_DATA_DIRECTORY } from '../server/utils/devil/config'
import {
  createSessionWithIdentifier,
  saveSession,
  loadSession,
  markGenerationReady,
  markGenerationFailed,
  listFilings
} from '../server/utils/devil/sessionStore'
import { buildFallbackInstrument, buildInstrumentSkeleton } from '../server/utils/devil/instrumentTemplates'

beforeAll(async (): Promise<void> => {
  await rm(DEVIL_DATA_DIRECTORY, { recursive: true, force: true })
})

describe('session generation lifecycle', () => {
  it('starts a session in the generating state without an instrument', async () => {
    const session = createSessionWithIdentifier('session-generating', 'I wish for a test.', 'actuary', 'precedence')
    await saveSession(session)

    const loaded = await loadSession('session-generating')
    expect(loaded?.status).toBe('generating')
    expect(loaded?.instrument).toBeUndefined()
  })

  it('moves to ready with the instrument attached', async () => {
    const session = createSessionWithIdentifier('session-ready', 'I wish for a test.', 'auditor', 'precedence')
    await saveSession(session)

    const instrument = buildFallbackInstrument(
      buildInstrumentSkeleton({ twistChainLength: 2, hasSeverability: false })
    )
    await markGenerationReady('session-ready', instrument)

    const loaded = await loadSession('session-ready')
    expect(loaded?.status).toBe('ready')
    expect(loaded?.instrument?.provisions.length).toBe(instrument.provisions.length)
  })

  it('moves to failed with the error recorded', async () => {
    const session = createSessionWithIdentifier('session-failed', 'I wish for a test.', 'tenuredClerk', 'precedence')
    await saveSession(session)

    await markGenerationFailed('session-failed', 'no text content')

    const loaded = await loadSession('session-failed')
    expect(loaded?.status).toBe('failed')
    expect(loaded?.generationError).toBe('no text content')
  })

  it('does not list unfinished sessions as filings', async () => {
    const filings = await listFilings()
    const identifiers = filings.map((filing) => filing.sessionIdentifier)
    expect(identifiers).not.toContain('session-generating')
    expect(identifiers).not.toContain('session-ready')
    expect(identifiers).not.toContain('session-failed')
  })

  it('returns null for an unknown session', async () => {
    expect(await loadSession('does-not-exist')).toBeNull()
  })
})
