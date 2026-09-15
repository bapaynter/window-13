import type { Instrument, NeutralizationMethod, ProvisionMechanism } from './instrumentSchema'
import type { InstrumentSimulation, ProvisionState } from './instrumentSimulation'
import type { NegotiationAction, NegotiationActionRecord, Outcome, SessionMeters } from './meters'
import { TRAP_THRESHOLD } from './meters'
import type { PlayerDefinition, PlayerSchedule, ProvisionTextOverrides } from './playerView'

export interface FinalProvisionDisposition {
  provisionIdentifier: string
  sectionNumber: string
  heading: string
  text: string
  consideration: string
  mechanism: ProvisionMechanism
  references: string[]
  disposition: ProvisionState
  isControlling: boolean
  neutralizationMethod: NeutralizationMethod | null
  substitutedBy?: string
  originalText?: string
}

export interface FinalActionLogEntry {
  round: number
  action: NegotiationAction
  targetIdentifier: string
  amendmentText?: string
}

export interface LaymanOutcome {
  twistSummary: string
  bypassStatus: 'none' | 'partial' | 'all' | 'draw'
  bypassDescription: string
  effectOnWish: string
}

export interface FinalRecord {
  outcome: Outcome
  recitals: string
  definitions: PlayerDefinition[]
  provisions: FinalProvisionDisposition[]
  schedules: PlayerSchedule[]
  controllingProvisionIdentifiers: string[]
  neutralizedControlIdentifiers: string[]
  danglingReferenceIdentifiers: string[]
  actionLog: FinalActionLogEntry[]
  administrativeSurcharge: number
  assessment: number
  trapThreshold: number
  trapSummary: string
  laymanOutcome: LaymanOutcome
}

function formatIdentifiers(identifiers: string[]): string {
  return identifiers.map((identifier) => `§${identifier}`).join(', ')
}

function buildLaymanOutcome(parameters: {
  instrument: Instrument
  actionRecords: NegotiationActionRecord[]
  simulation: InstrumentSimulation
  outcome: Outcome
}): LaymanOutcome {
  const { instrument, actionRecords, simulation, outcome } = parameters
  const neutralized = simulation.neutralizedControlIdentifiers
  const remaining = instrument.controllingProvisionIdentifiers.filter(
    (identifier) => !neutralized.includes(identifier)
  )
  const amendedSeverability = actionRecords
    .filter(
      (record) =>
        record.action === 'amend' && instrument.severabilityProvisionIdentifiers.includes(record.targetIdentifier)
    )
    .map((record) => record.targetIdentifier)

  if (outcome === 'draw') {
    return {
      twistSummary: instrument.laymanExplanation.twistSummary,
      bypassStatus: 'draw',
      bypassDescription: 'You withdrew without signing. The Instrument was not executed.',
      effectOnWish: 'Your wish is not granted. No action was taken.'
    }
  }

  if (neutralized.length === 0) {
    return {
      twistSummary: instrument.laymanExplanation.twistSummary,
      bypassStatus: 'none',
      bypassDescription:
        remaining.length > 0
          ? `No provision was neutralized. ${formatIdentifiers(remaining)} remain in force.`
          : 'No provision was neutralized.',
      effectOnWish: instrument.laymanExplanation.ifNotBypassed
    }
  }

  if (remaining.length === 0) {
    const actions =
      amendedSeverability.length > 0
        ? `You amended ${formatIdentifiers(amendedSeverability)} and struck ${formatIdentifiers(neutralized)}.`
        : `You struck ${formatIdentifiers(neutralized)}.`
    return {
      twistSummary: instrument.laymanExplanation.twistSummary,
      bypassStatus: 'all',
      bypassDescription: `${actions} Every term that altered your wish is neutralized.`,
      effectOnWish: instrument.laymanExplanation.ifBypassed
    }
  }

  return {
    twistSummary: instrument.laymanExplanation.twistSummary,
    bypassStatus: 'partial',
    bypassDescription: `You neutralized ${formatIdentifiers(neutralized)}. ${formatIdentifiers(remaining)} remain in force.`,
    effectOnWish: instrument.laymanExplanation.ifPartiallyBypassed
  }
}

export function buildFinalRecord(parameters: {
  instrument: Instrument
  actionRecords: NegotiationActionRecord[]
  overrides: ProvisionTextOverrides
  simulation: InstrumentSimulation
  meters: SessionMeters
  outcome: Outcome
}): FinalRecord {
  const { instrument, actionRecords, overrides, simulation, meters, outcome } = parameters
  const controllingIdentifiers = new Set(instrument.controllingProvisionIdentifiers)

  const provisions: FinalProvisionDisposition[] = instrument.provisions.map((provision) => {
    const override = overrides[provision.provisionIdentifier]
    const disposition = simulation.provisionStates[provision.provisionIdentifier] ?? 'untouched'
    const substitutedBy = simulation.substitutionSourceByIdentifier[provision.provisionIdentifier]
    return {
      provisionIdentifier: provision.provisionIdentifier,
      sectionNumber: provision.sectionNumber,
      heading: provision.heading,
      text: override ?? provision.text,
      consideration: provision.consideration,
      mechanism: provision.mechanism,
      references: [...provision.references],
      disposition,
      isControlling: controllingIdentifiers.has(provision.provisionIdentifier),
      neutralizationMethod:
        instrument.neutralizationMethodByIdentifier[provision.provisionIdentifier] ?? null,
      ...(substitutedBy !== undefined ? { substitutedBy } : {}),
      ...(override !== undefined ? { originalText: provision.text } : {})
    }
  })

  return {
    outcome,
    recitals: instrument.recitals,
    definitions: instrument.definitions.map((definition) => ({
      definitionIdentifier: definition.definitionIdentifier,
      term: definition.term,
      text: definition.text,
      references: [...definition.references]
    })),
    provisions,
    schedules: instrument.schedules.map((schedule) => ({
      scheduleIdentifier: schedule.scheduleIdentifier,
      title: schedule.title,
      body: schedule.body,
      referencedBy: [...schedule.referencedBy]
    })),
    controllingProvisionIdentifiers: [...instrument.controllingProvisionIdentifiers],
    neutralizedControlIdentifiers: [...simulation.neutralizedControlIdentifiers],
    danglingReferenceIdentifiers: [...simulation.danglingReferenceIdentifiers],
    actionLog: actionRecords.map((record) => ({
      round: record.round,
      action: record.action,
      targetIdentifier: record.targetIdentifier,
      ...(record.amendmentText !== undefined ? { amendmentText: record.amendmentText } : {})
    })),
    administrativeSurcharge: meters.administrativeSurcharge,
    assessment: meters.assessment,
    trapThreshold: TRAP_THRESHOLD,
    trapSummary: instrument.trapSummary,
    laymanOutcome: buildLaymanOutcome({ instrument, actionRecords, simulation, outcome })
  }
}
