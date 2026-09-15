import type { Instrument } from './instrumentSchema'
import {
  MAXIMUM_DEFINITION_LENGTH,
  MAXIMUM_LAYMAN_LENGTH,
  MAXIMUM_PROVISION_LENGTH,
  MAXIMUM_RECITALS_LENGTH,
  MAXIMUM_SCHEDULE_LENGTH,
  validateInstrument
} from './instrumentSchema'
import type { InstrumentSkeleton } from './instrumentTemplates'
import type { PersonalityProfile } from './personalities'
import { buildInstrumentMessages } from './prompts'
import { requestCompletionDetailed } from './openrouter'
import { parseJsonObject } from './modelJson'
import {
  recordGenerationAttempt,
  recordGenerationFailure,
  recordGenerationSuccess
} from './generationTelemetry'

// Escalating completion budgets: deepseek-v4.1-flash is a reasoning model, so a
// truncated reply is retried with more headroom before the ticket is failed.
const ATTEMPT_TOKEN_BUDGETS = [16000, 24000, 32000]

const PLACEHOLDER_MARKERS = [
  'a long recital describing',
  'a key word taken from the applicant',
  'points performance at article 6',
  'a table listing the processing fee'
]

export class InstrumentGenerationError extends Error {}

interface InstrumentModelReply {
  recitals?: unknown
  trapSummary?: unknown
  layman?: {
    twistSummary?: unknown
    ifBypassed?: unknown
    ifPartiallyBypassed?: unknown
    ifNotBypassed?: unknown
  }
  definitions?: Record<string, { term?: unknown; text?: unknown }>
  provisions?: Record<string, { heading?: unknown; text?: unknown; consideration?: unknown }>
  schedules?: Record<string, { title?: unknown; body?: unknown }>
  substitutions?: Record<string, unknown>
}

function readRequiredText(value: unknown, maximumLength: number): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > maximumLength ? trimmed.slice(0, maximumLength) : trimmed
}

// Every field must come from the model. A missing field fails the attempt rather
// than falling back to skeleton hint text, which must never reach the applicant.
export function assembleInstrumentStrict(
  skeleton: InstrumentSkeleton,
  reply: InstrumentModelReply | null
): Instrument | null {
  if (reply === null) {
    return null
  }

  const recitals = readRequiredText(reply.recitals, MAXIMUM_RECITALS_LENGTH)
  if (recitals === null) {
    return null
  }

  const definitions = []
  for (const definition of skeleton.definitions) {
    const entry = reply.definitions?.[definition.definitionIdentifier]
    const term = readRequiredText(entry?.term, 120)
    const text = readRequiredText(entry?.text, MAXIMUM_DEFINITION_LENGTH)
    if (term === null || text === null) {
      return null
    }
    definitions.push({
      definitionIdentifier: definition.definitionIdentifier,
      term,
      text,
      references: [...definition.references]
    })
  }

  const provisions = []
  for (const provision of skeleton.provisions) {
    const entry = reply.provisions?.[provision.provisionIdentifier]
    const heading = readRequiredText(entry?.heading, 160)
    const text = readRequiredText(entry?.text, MAXIMUM_PROVISION_LENGTH)
    const consideration = readRequiredText(entry?.consideration, 200)
    if (heading === null || text === null || consideration === null) {
      return null
    }
    provisions.push({
      provisionIdentifier: provision.provisionIdentifier,
      sectionNumber: provision.sectionNumber,
      heading,
      text,
      references: [...provision.references],
      consideration,
      mechanism: provision.mechanism
    })
  }

  const schedules = []
  for (const schedule of skeleton.schedules) {
    const entry = reply.schedules?.[schedule.scheduleIdentifier]
    const title = readRequiredText(entry?.title, 160)
    const body = readRequiredText(entry?.body, MAXIMUM_SCHEDULE_LENGTH)
    if (title === null || body === null) {
      return null
    }
    schedules.push({
      scheduleIdentifier: schedule.scheduleIdentifier,
      title,
      body,
      referencedBy: [...schedule.referencedBy]
    })
  }

  const substitutionWordingByIdentifier = { ...skeleton.substitutionWordingByIdentifier }
  for (const [severabilityIdentifier, wording] of Object.entries(reply.substitutions ?? {})) {
    if (substitutionWordingByIdentifier[severabilityIdentifier] !== undefined) {
      const read = readRequiredText(wording, MAXIMUM_PROVISION_LENGTH)
      if (read !== null) {
        substitutionWordingByIdentifier[severabilityIdentifier] = read
      }
    }
  }

  const twistSummary = readRequiredText(reply.layman?.twistSummary, MAXIMUM_LAYMAN_LENGTH)
  const ifBypassed = readRequiredText(reply.layman?.ifBypassed, MAXIMUM_LAYMAN_LENGTH)
  const ifPartiallyBypassed = readRequiredText(reply.layman?.ifPartiallyBypassed, MAXIMUM_LAYMAN_LENGTH)
  const ifNotBypassed = readRequiredText(reply.layman?.ifNotBypassed, MAXIMUM_LAYMAN_LENGTH)
  const trapSummary = readRequiredText(reply.trapSummary, 800)
  if (
    twistSummary === null ||
    ifBypassed === null ||
    ifPartiallyBypassed === null ||
    ifNotBypassed === null ||
    trapSummary === null
  ) {
    return null
  }

  return {
    recitals,
    definitions,
    provisions,
    schedules,
    controllingProvisionIdentifiers: [...skeleton.controllingProvisionIdentifiers],
    neutralizationMethodByIdentifier: { ...skeleton.neutralizationMethodByIdentifier },
    severabilityProvisionIdentifiers: [...skeleton.severabilityProvisionIdentifiers],
    substitutionCoverageByIdentifier: { ...skeleton.substitutionCoverageByIdentifier },
    substitutionWordingByIdentifier,
    laymanExplanation: { twistSummary, ifBypassed, ifPartiallyBypassed, ifNotBypassed },
    trapSummary
  }
}

export function containsPlaceholderText(instrument: Instrument): boolean {
  const text = [
    instrument.recitals,
    instrument.laymanExplanation.twistSummary,
    ...instrument.definitions.flatMap((definition) => [definition.term, definition.text]),
    ...instrument.provisions.flatMap((provision) => [provision.heading, provision.text, provision.consideration]),
    ...instrument.schedules.flatMap((schedule) => [schedule.title, schedule.body])
  ]
    .join(' ')
    .toLowerCase()
  return PLACEHOLDER_MARKERS.some((marker) => text.includes(marker))
}

export async function generateInstrument(parameters: {
  personality: PersonalityProfile
  skeleton: InstrumentSkeleton
  wish: string
  model: string
}): Promise<Instrument> {
  let lastFailureReason = 'unknown'

  for (let attempt = 0; attempt < ATTEMPT_TOKEN_BUDGETS.length; attempt += 1) {
    await recordGenerationAttempt()
    try {
      const result = await requestCompletionDetailed({
        model: parameters.model,
        messages: buildInstrumentMessages(parameters.personality, parameters.skeleton, parameters.wish),
        jsonMode: true,
        maximumOutputTokens: ATTEMPT_TOKEN_BUDGETS[attempt]
      })

      if (result.content.trim().length === 0) {
        lastFailureReason = result.finishReason === 'length' ? 'truncated-empty' : 'empty-content'
        await recordGenerationFailure(lastFailureReason)
        continue
      }

      const reply = parseJsonObject<InstrumentModelReply>(result.content)
      if (reply === null) {
        lastFailureReason = result.finishReason === 'length' ? 'truncated-json' : 'unparseable'
        await recordGenerationFailure(lastFailureReason)
        continue
      }

      const assembled = assembleInstrumentStrict(parameters.skeleton, reply)
      if (assembled === null) {
        lastFailureReason = 'incomplete-reply'
        await recordGenerationFailure(lastFailureReason)
        continue
      }

      if (containsPlaceholderText(assembled)) {
        lastFailureReason = 'placeholder-text'
        await recordGenerationFailure(lastFailureReason)
        continue
      }

      const validation = validateInstrument(assembled)
      if (!validation.isValid || validation.instrument === undefined) {
        lastFailureReason = `invalid:${validation.rejectionReason}`
        await recordGenerationFailure(lastFailureReason)
        continue
      }

      await recordGenerationSuccess()
      return validation.instrument
    } catch (error) {
      lastFailureReason = 'request-error'
      console.error('generateInstrument: attempt failed', error)
      await recordGenerationFailure(lastFailureReason)
    }
  }

  console.error(`generateInstrument: exhausted ${ATTEMPT_TOKEN_BUDGETS.length} attempts (${lastFailureReason})`)
  throw new InstrumentGenerationError(`instrument generation failed: ${lastFailureReason}`)
}
