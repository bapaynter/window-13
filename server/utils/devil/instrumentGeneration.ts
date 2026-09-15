import type { Instrument } from './instrumentSchema'
import {
  MAXIMUM_DEFINITION_LENGTH,
  MAXIMUM_PROVISION_LENGTH,
  MAXIMUM_RECITALS_LENGTH,
  MAXIMUM_SCHEDULE_LENGTH,
  validateInstrument
} from './instrumentSchema'
import { buildFallbackInstrument, type InstrumentSkeleton } from './instrumentTemplates'
import type { PersonalityProfile } from './personalities'
import { buildInstrumentMessages } from './prompts'
import { requestCompletion } from './openrouter'
import { parseJsonObject } from './modelJson'

interface InstrumentModelReply {
  recitals?: unknown
  trapSummary?: unknown
  definitions?: Record<string, { term?: unknown; text?: unknown }>
  provisions?: Record<string, { heading?: unknown; text?: unknown; consideration?: unknown }>
  schedules?: Record<string, { title?: unknown; body?: unknown }>
  substitutions?: Record<string, unknown>
}

function readText(value: unknown, fallback: string, maximumLength: number): string {
  const chosen = typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
  return chosen.length > maximumLength ? chosen.slice(0, maximumLength) : chosen
}

function assembleInstrument(skeleton: InstrumentSkeleton, reply: InstrumentModelReply | null): Instrument {
  const fallback = buildFallbackInstrument(skeleton)
  if (reply === null) {
    return fallback
  }

  const substitutionWordingByIdentifier = { ...fallback.substitutionWordingByIdentifier }
  for (const [severabilityIdentifier, wording] of Object.entries(reply.substitutions ?? {})) {
    if (substitutionWordingByIdentifier[severabilityIdentifier] !== undefined) {
      substitutionWordingByIdentifier[severabilityIdentifier] = readText(
        wording,
        substitutionWordingByIdentifier[severabilityIdentifier],
        MAXIMUM_PROVISION_LENGTH
      )
    }
  }

  return {
    recitals: readText(reply.recitals, fallback.recitals, MAXIMUM_RECITALS_LENGTH),
    definitions: fallback.definitions.map((definition) => ({
      ...definition,
      term: readText(reply.definitions?.[definition.definitionIdentifier]?.term, definition.term, 120),
      text: readText(
        reply.definitions?.[definition.definitionIdentifier]?.text,
        definition.text,
        MAXIMUM_DEFINITION_LENGTH
      )
    })),
    provisions: fallback.provisions.map((provision) => ({
      ...provision,
      heading: readText(
        reply.provisions?.[provision.provisionIdentifier]?.heading,
        provision.heading,
        160
      ),
      text: readText(
        reply.provisions?.[provision.provisionIdentifier]?.text,
        provision.text,
        MAXIMUM_PROVISION_LENGTH
      ),
      consideration: readText(
        reply.provisions?.[provision.provisionIdentifier]?.consideration,
        provision.consideration,
        200
      )
    })),
    schedules: fallback.schedules.map((schedule) => ({
      ...schedule,
      title: readText(
        reply.schedules?.[schedule.scheduleIdentifier]?.title,
        schedule.title,
        160
      ),
      body: readText(
        reply.schedules?.[schedule.scheduleIdentifier]?.body,
        schedule.body,
        MAXIMUM_SCHEDULE_LENGTH
      )
    })),
    controllingProvisionIdentifiers: [...fallback.controllingProvisionIdentifiers],
    neutralizationMethodByIdentifier: { ...fallback.neutralizationMethodByIdentifier },
    severabilityProvisionIdentifiers: [...fallback.severabilityProvisionIdentifiers],
    substitutionCoverageByIdentifier: { ...fallback.substitutionCoverageByIdentifier },
    substitutionWordingByIdentifier,
    trapSummary: readText(reply.trapSummary, fallback.trapSummary, 800)
  }
}

export async function generateInstrument(parameters: {
  personality: PersonalityProfile
  skeleton: InstrumentSkeleton
  wish: string
  model: string
  maximumOutputTokens?: number
}): Promise<Instrument> {
  const attempts = 2
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const rawReply = await requestCompletion({
        model: parameters.model,
        messages: buildInstrumentMessages(parameters.personality, parameters.skeleton, parameters.wish),
        jsonMode: true,
        maximumOutputTokens: parameters.maximumOutputTokens
      })
      const assembled = assembleInstrument(
        parameters.skeleton,
        parseJsonObject<InstrumentModelReply>(rawReply)
      )
      const validation = validateInstrument(assembled)
      if (validation.isValid && validation.instrument) {
        return validation.instrument
      }
      console.error('generateInstrument: assembled instrument failed validation', validation.rejectionReason)
    } catch (error) {
      console.error('generateInstrument: attempt failed', error)
    }
  }
  return buildFallbackInstrument(parameters.skeleton)
}
