import { describe, it, expect, beforeAll } from 'vitest'
import { rm } from 'node:fs/promises'
import { assembleInstrumentStrict, containsPlaceholderText } from '../server/utils/devil/instrumentGeneration'
import { buildFallbackInstrument, buildInstrumentSkeleton } from '../server/utils/devil/instrumentTemplates'
import { buildInstrumentMessages } from '../server/utils/devil/prompts'
import { PERSONALITY_PROFILES } from '../server/utils/devil/personalities'
import { DEVIL_STATS_PATH } from '../server/utils/devil/config'
import {
  readGenerationStats,
  recordGenerationAttempt,
  recordGenerationFailure,
  recordGenerationSuccess
} from '../server/utils/devil/generationTelemetry'

const SKELETON = buildInstrumentSkeleton({ twistChainLength: 3, hasSeverability: true })

function buildCompleteReply() {
  const definitions: Record<string, { term: string; text: string }> = {}
  for (const definition of SKELETON.definitions) {
    definitions[definition.definitionIdentifier] = { term: `Term ${definition.definitionIdentifier}`, text: `Definition text ${definition.definitionIdentifier}.` }
  }
  const provisions: Record<string, { heading: string; text: string; consideration: string }> = {}
  for (const provision of SKELETON.provisions) {
    provisions[provision.provisionIdentifier] = {
      heading: `Heading ${provision.provisionIdentifier}`,
      text: `Provision text ${provision.provisionIdentifier}.`,
      consideration: 'standard handling'
    }
  }
  const schedules: Record<string, { title: string; body: string }> = {}
  for (const schedule of SKELETON.schedules) {
    schedules[schedule.scheduleIdentifier] = { title: `Schedule ${schedule.scheduleIdentifier}`, body: 'Schedule body.' }
  }
  return {
    recitals: 'A full recital specific to this wish.',
    definitions,
    provisions,
    schedules,
    substitutions: { '9.1': 'Substituted wording.', '9.2': 'Substituted wording two.' },
    layman: {
      twistSummary: 'What the document did.',
      ifBypassed: 'What it becomes.',
      ifPartiallyBypassed: 'Partial.',
      ifNotBypassed: 'Full consequence.'
    },
    trapSummary: 'Internal note.'
  }
}

describe('assembleInstrumentStrict', () => {
  it('assembles a complete reply into a valid instrument', () => {
    const instrument = assembleInstrumentStrict(SKELETON, buildCompleteReply())
    expect(instrument).not.toBeNull()
    expect(instrument?.provisions).toHaveLength(SKELETON.provisions.length)
  })

  it('returns null for a null reply rather than serving hint text', () => {
    expect(assembleInstrumentStrict(SKELETON, null)).toBeNull()
  })

  it('returns null when a provision is missing', () => {
    const reply = buildCompleteReply()
    delete reply.provisions[SKELETON.provisions[0].provisionIdentifier]
    expect(assembleInstrumentStrict(SKELETON, reply)).toBeNull()
  })

  it('returns null when a field is blank', () => {
    const reply = buildCompleteReply()
    reply.provisions[SKELETON.provisions[0].provisionIdentifier].text = '   '
    expect(assembleInstrumentStrict(SKELETON, reply)).toBeNull()
  })

  it('returns null when the layman block is missing', () => {
    const reply = buildCompleteReply() as Record<string, unknown>
    delete reply.layman
    expect(assembleInstrumentStrict(SKELETON, reply as never)).toBeNull()
  })

  it('clamps overlong text instead of failing', () => {
    const reply = buildCompleteReply()
    reply.provisions[SKELETON.provisions[0].provisionIdentifier].text = 'x'.repeat(2000)
    const instrument = assembleInstrumentStrict(SKELETON, reply)
    expect(instrument?.provisions[0].text.length).toBeLessThanOrEqual(900)
  })
})

describe('containsPlaceholderText', () => {
  it('flags skeleton hint text', () => {
    expect(containsPlaceholderText(buildFallbackInstrument(SKELETON))).toBe(true)
  })

  it('accepts a fully written instrument', () => {
    const instrument = assembleInstrumentStrict(SKELETON, buildCompleteReply())
    expect(instrument).not.toBeNull()
    expect(containsPlaceholderText(instrument as never)).toBe(false)
  })
})

describe('buildInstrumentMessages', () => {
  it('names the grant as absolute and bans meta language', () => {
    const messages = buildInstrumentMessages(PERSONALITY_PROFILES.actuary, SKELETON, 'I wish for a test.')
    const systemContent = messages[0].content.toLowerCase()
    expect(systemContent).toContain('grants the applicant')
    expect(systemContent).toContain('never use the words "twist"')
  })
})

describe('generation telemetry', () => {
  beforeAll(async (): Promise<void> => {
    await rm(DEVIL_STATS_PATH, { force: true })
  })

  it('counts attempts, successes, and failures by reason', async () => {
    await recordGenerationAttempt()
    await recordGenerationSuccess()
    await recordGenerationAttempt()
    await recordGenerationFailure('truncated-json')
    const stats = await readGenerationStats()
    expect(stats.attempts).toBe(2)
    expect(stats.successes).toBe(1)
    expect(stats.failures).toBe(1)
    expect(stats.failuresByReason['truncated-json']).toBe(1)
  })
})
