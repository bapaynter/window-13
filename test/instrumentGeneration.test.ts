import { describe, it, expect, beforeAll } from 'vitest'
import { rm } from 'node:fs/promises'
import {
  assembleInstrumentStrict,
  containsPlaceholderText,
  validateGeneratedContent,
  buildScheduleOfCharges
} from '../server/utils/devil/instrumentGeneration'
import { buildFallbackInstrument, buildInstrumentSkeleton } from '../server/utils/devil/instrumentTemplates'
import { buildInstrumentMessages } from '../server/utils/devil/prompts'
import { PERSONALITY_PROFILES } from '../server/utils/devil/personalities'
import { DEVIL_STATS_PATH } from '../server/utils/devil/config'
import {
  SURCHARGE_PER_AMENDMENT,
  SURCHARGE_PER_STRIKE,
  TRAP_THRESHOLD
} from '../server/utils/devil/meters'
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
    definitions[definition.definitionIdentifier] = {
      term: `Term ${definition.definitionIdentifier}`,
      text: `Definition text ${definition.definitionIdentifier}.`
    }
  }
  const provisions: Record<string, { heading: string; text: string; consideration: string }> = {}
  for (const provision of SKELETON.provisions) {
    provisions[provision.provisionIdentifier] = {
      heading: `Heading ${provision.provisionIdentifier}`,
      text: `Provision text ${provision.provisionIdentifier}.`,
      consideration: 'standard handling'
    }
  }
  const keyTerm = definitions['1.4'].term
  provisions['6.1'].text = `In performance of the Wish under §2.1 the Department applies ${keyTerm} to the Wish as stated.`
  return {
    recitals: 'On the date recorded the Applicant submitted the Wish, which was registered at intake.',
    definitions,
    provisions,
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

describe('validateGeneratedContent', () => {
  it('accepts a clean instrument whose performance clause names the key term', () => {
    const instrument = assembleInstrumentStrict(SKELETON, buildCompleteReply())
    expect(validateGeneratedContent(instrument as never)).toBeNull()
  })

  it('rejects recitals that cross-reference the articles', () => {
    const instrument = assembleInstrumentStrict(SKELETON, buildCompleteReply())
    if (instrument === null) throw new Error('expected instrument')
    instrument.recitals = 'The Wish was registered and performed under §6.1.'
    expect(validateGeneratedContent(instrument)).toBe('recitals-not-clean')
  })

  it('rejects recitals that state the mechanism', () => {
    const instrument = assembleInstrumentStrict(SKELETON, buildCompleteReply())
    if (instrument === null) throw new Error('expected instrument')
    instrument.recitals = 'The mechanism of performance is that the Applicant never wakes.'
    expect(validateGeneratedContent(instrument)).toBe('recitals-not-clean')
  })

  it('rejects an abstract performance clause that omits the key term', () => {
    const instrument = assembleInstrumentStrict(SKELETON, buildCompleteReply())
    if (instrument === null) throw new Error('expected instrument')
    const performance = instrument.provisions.find((p) => p.provisionIdentifier === '6.1')
    if (performance === undefined) throw new Error('expected performance clause')
    performance.text = 'The term defined in §1.4 applies to the grant under §2.1 in the sense stated.'
    expect(validateGeneratedContent(instrument)).toBe('performance-not-concrete')
  })
})

describe('buildScheduleOfCharges', () => {
  it('reflects the real constants so it cannot contradict the economy', () => {
    const schedules = buildScheduleOfCharges(SKELETON)
    const body = schedules[0].body
    expect(body).toContain(String(SURCHARGE_PER_STRIKE))
    expect(body).toContain(String(SURCHARGE_PER_AMENDMENT))
    expect(body).toContain(String(TRAP_THRESHOLD))
  })
})

describe('buildInstrumentMessages', () => {
  it('names the grant as absolute, bans meta language, and forbids recital cross-references', () => {
    const messages = buildInstrumentMessages(PERSONALITY_PROFILES.actuary, SKELETON, 'I wish for a test.')
    const systemContent = messages[0].content.toLowerCase()
    expect(systemContent).toContain('grants the applicant')
    expect(systemContent).toContain('never use the words "twist"')
    expect(systemContent).toContain('intake record only')
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
