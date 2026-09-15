import type { Instrument, NeutralizationMethod, ProvisionMechanism } from './instrumentSchema'
import type { InstrumentSimulation, ProvisionState } from './instrumentSimulation'
import type { NegotiationAction, NegotiationActionRecord, Outcome, SessionMeters } from './meters'
import { TRAP_THRESHOLD } from './meters'
import type { PlayerDefinition, PlayerSchedule } from './playerView'

export interface FinalProvisionDisposition {
  provisionIdentifier: string
  sectionNumber: string
  heading: string
  text: string
  consideration: string
  processingFee: number
  mechanism: ProvisionMechanism
  references: string[]
  disposition: ProvisionState
  isControlling: boolean
  neutralizationMethod: NeutralizationMethod | null
  originalText?: string
}

export interface FinalActionLogEntry {
  round: number
  action: NegotiationAction
  targetIdentifier: string
  feeApplied: number
  amendmentText?: string
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
  processingFee: number
  administrativeSurcharge: number
  burden: number
  trapThreshold: number
  trapSummary: string
}

function findLatestAmendmentText(
  actionRecords: NegotiationActionRecord[],
  provisionIdentifier: string
): string | null {
  const amendments = actionRecords.filter(
    (record) => record.action === 'amend' && record.targetIdentifier === provisionIdentifier
  )
  const lastAmendment = amendments.at(-1)
  return lastAmendment?.amendmentText ?? null
}

export function buildFinalRecord(parameters: {
  instrument: Instrument
  actionRecords: NegotiationActionRecord[]
  simulation: InstrumentSimulation
  meters: SessionMeters
  outcome: Outcome
}): FinalRecord {
  const { instrument, actionRecords, simulation, meters, outcome } = parameters
  const controllingIdentifiers = new Set(instrument.controllingProvisionIdentifiers)

  const provisions: FinalProvisionDisposition[] = instrument.provisions.map((provision) => {
    const amendmentText = findLatestAmendmentText(actionRecords, provision.provisionIdentifier)
    const disposition = simulation.provisionStates[provision.provisionIdentifier] ?? 'untouched'
    return {
      provisionIdentifier: provision.provisionIdentifier,
      sectionNumber: provision.sectionNumber,
      heading: provision.heading,
      text: amendmentText ?? provision.text,
      consideration: provision.consideration,
      processingFee: provision.processingFee,
      mechanism: provision.mechanism,
      references: [...provision.references],
      disposition,
      isControlling: controllingIdentifiers.has(provision.provisionIdentifier),
      neutralizationMethod:
        instrument.neutralizationMethodByIdentifier[provision.provisionIdentifier] ?? null,
      ...(amendmentText !== null ? { originalText: provision.text } : {})
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
      feeApplied: record.processingFee,
      ...(record.amendmentText !== undefined ? { amendmentText: record.amendmentText } : {})
    })),
    processingFee: meters.processingFee,
    administrativeSurcharge: meters.administrativeSurcharge,
    burden: meters.burden,
    trapThreshold: TRAP_THRESHOLD,
    trapSummary: instrument.trapSummary
  }
}
