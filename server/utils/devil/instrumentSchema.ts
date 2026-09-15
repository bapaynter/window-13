import { z } from 'zod'

export const PROVISION_MECHANISMS = [
  'delivery',
  'consideration',
  'waiver',
  'term',
  'precedence',
  'severability',
  'incorporation',
  'definition',
  'survivorship',
  'ambiguity'
] as const

export const NEUTRALIZATION_METHODS = ['strike', 'amend'] as const

export const MAXIMUM_PROVISION_LENGTH = 900
export const MAXIMUM_DEFINITION_LENGTH = 600
export const MAXIMUM_SCHEDULE_LENGTH = 700
export const MAXIMUM_RECITALS_LENGTH = 1600
export const MAXIMUM_PROVISION_FEE = 40

export const definitionSchema = z.object({
  definitionIdentifier: z.string().min(1),
  term: z.string().min(1),
  text: z.string().min(1).max(MAXIMUM_DEFINITION_LENGTH),
  references: z.array(z.string())
})

export const provisionSchema = z.object({
  provisionIdentifier: z.string().min(1),
  sectionNumber: z.string().min(1),
  heading: z.string().min(1),
  text: z.string().min(1).max(MAXIMUM_PROVISION_LENGTH),
  references: z.array(z.string()),
  consideration: z.string().min(1),
  processingFee: z.number().int().min(0).max(MAXIMUM_PROVISION_FEE),
  mechanism: z.enum(PROVISION_MECHANISMS)
})

export const scheduleSchema = z.object({
  scheduleIdentifier: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1).max(MAXIMUM_SCHEDULE_LENGTH),
  referencedBy: z.array(z.string())
})

export const instrumentSchema = z.object({
  recitals: z.string().min(1).max(MAXIMUM_RECITALS_LENGTH),
  definitions: z.array(definitionSchema).min(1),
  provisions: z.array(provisionSchema).min(6),
  schedules: z.array(scheduleSchema),
  controllingProvisionIdentifiers: z.array(z.string()).min(1),
  neutralizationMethodByIdentifier: z.record(z.string(), z.enum(NEUTRALIZATION_METHODS)),
  severabilityProvisionIdentifiers: z.array(z.string()),
  substitutionCoverageByIdentifier: z.record(z.string(), z.array(z.string())),
  substitutionWordingByIdentifier: z.record(z.string(), z.string()),
  trapSummary: z.string().min(1)
})

export type Definition = z.infer<typeof definitionSchema>
export type Provision = z.infer<typeof provisionSchema>
export type Schedule = z.infer<typeof scheduleSchema>
export type Instrument = z.infer<typeof instrumentSchema>
export type ProvisionMechanism = (typeof PROVISION_MECHANISMS)[number]
export type NeutralizationMethod = (typeof NEUTRALIZATION_METHODS)[number]

export type InstrumentRejectionReason =
  | 'schema'
  | 'not-an-object'
  | 'unparseable'
  | 'unknown-reference'
  | 'unknown-controlling-provision'
  | 'missing-neutralization-method'
  | 'unknown-severability-provision'
  | 'unknown-substitution-target'

export interface InstrumentValidationResult {
  isValid: boolean
  instrument?: Instrument
  rejectionReason?: InstrumentRejectionReason
}

function collectKnownIdentifiers(instrument: Instrument): Set<string> {
  const identifiers = new Set<string>()
  for (const definition of instrument.definitions) {
    identifiers.add(definition.definitionIdentifier)
  }
  for (const provision of instrument.provisions) {
    identifiers.add(provision.provisionIdentifier)
  }
  for (const schedule of instrument.schedules) {
    identifiers.add(schedule.scheduleIdentifier)
  }
  return identifiers
}

export function validateInstrument(candidate: unknown): InstrumentValidationResult {
  if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { isValid: false, rejectionReason: 'not-an-object' }
  }

  const parsed = instrumentSchema.safeParse(candidate)
  if (!parsed.success) {
    return { isValid: false, rejectionReason: 'schema' }
  }

  const instrument = parsed.data
  const knownIdentifiers = collectKnownIdentifiers(instrument)
  const provisionIdentifiers = new Set(instrument.provisions.map((provision) => provision.provisionIdentifier))

  for (const definition of instrument.definitions) {
    if (definition.references.some((reference) => !knownIdentifiers.has(reference))) {
      return { isValid: false, rejectionReason: 'unknown-reference' }
    }
  }
  for (const provision of instrument.provisions) {
    if (provision.references.some((reference) => !knownIdentifiers.has(reference))) {
      return { isValid: false, rejectionReason: 'unknown-reference' }
    }
  }
  for (const schedule of instrument.schedules) {
    if (schedule.referencedBy.some((reference) => !knownIdentifiers.has(reference))) {
      return { isValid: false, rejectionReason: 'unknown-reference' }
    }
  }

  for (const controllingIdentifier of instrument.controllingProvisionIdentifiers) {
    if (!provisionIdentifiers.has(controllingIdentifier)) {
      return { isValid: false, rejectionReason: 'unknown-controlling-provision' }
    }
    if (instrument.neutralizationMethodByIdentifier[controllingIdentifier] === undefined) {
      return { isValid: false, rejectionReason: 'missing-neutralization-method' }
    }
  }

  for (const severabilityIdentifier of instrument.severabilityProvisionIdentifiers) {
    if (!provisionIdentifiers.has(severabilityIdentifier)) {
      return { isValid: false, rejectionReason: 'unknown-severability-provision' }
    }
  }

  for (const [severabilityIdentifier, coverage] of Object.entries(instrument.substitutionCoverageByIdentifier)) {
    if (!provisionIdentifiers.has(severabilityIdentifier)) {
      return { isValid: false, rejectionReason: 'unknown-severability-provision' }
    }
    for (const coverageTarget of coverage) {
      if (coverageTarget !== '*' && !knownIdentifiers.has(coverageTarget)) {
        return { isValid: false, rejectionReason: 'unknown-substitution-target' }
      }
    }
  }

  return { isValid: true, instrument }
}

export function parseInstrumentJson(rawText: string): InstrumentValidationResult {
  const firstBrace = rawText.indexOf('{')
  const lastBrace = rawText.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return { isValid: false, rejectionReason: 'unparseable' }
  }
  try {
    return validateInstrument(JSON.parse(rawText.slice(firstBrace, lastBrace + 1)))
  } catch {
    return { isValid: false, rejectionReason: 'unparseable' }
  }
}
