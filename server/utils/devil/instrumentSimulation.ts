import type { Instrument } from './instrumentSchema'
import type { NegotiationActionRecord } from './meters'

export type ProvisionState = 'untouched' | 'approved' | 'struck' | 'amended' | 'substituted'

export interface InstrumentSimulation {
  provisionStates: Record<string, ProvisionState>
  activeSeverabilityIdentifiers: string[]
  substitutedProvisionIdentifiers: string[]
  neutralizedControlIdentifiers: string[]
  danglingReferenceIdentifiers: string[]
  neutralizedControlCount: number
  totalControlCount: number
  isTrapNeutralized: boolean
}

// A substituted severability provision still stands, so it remains active.
const ACTIVE_SEVERABILITY_STATES: ProvisionState[] = ['untouched', 'approved', 'substituted']
const REMOVED_STATES: ProvisionState[] = ['struck', 'substituted']

function buildInitialProvisionStates(instrument: Instrument): Record<string, ProvisionState> {
  const provisionStates: Record<string, ProvisionState> = {}
  for (const provision of instrument.provisions) {
    provisionStates[provision.provisionIdentifier] = 'untouched'
  }
  return provisionStates
}

function severabilityCoversTarget(
  instrument: Instrument,
  severabilityIdentifier: string,
  targetIdentifier: string
): boolean {
  const coverage = instrument.substitutionCoverageByIdentifier[severabilityIdentifier] ?? []
  return coverage.includes('*') || coverage.includes(targetIdentifier)
}

function collectDanglingReferenceIdentifiers(
  instrument: Instrument,
  provisionStates: Record<string, ProvisionState>
): string[] {
  const dangling = new Set<string>()
  const recordRemovedReferences = (references: string[]): void => {
    for (const reference of references) {
      const state = provisionStates[reference]
      if (state !== undefined && REMOVED_STATES.includes(state)) {
        dangling.add(reference)
      }
    }
  }
  for (const definition of instrument.definitions) {
    recordRemovedReferences(definition.references)
  }
  for (const provision of instrument.provisions) {
    recordRemovedReferences(provision.references)
  }
  for (const schedule of instrument.schedules) {
    recordRemovedReferences(schedule.referencedBy)
  }
  return [...dangling].sort()
}

export function simulateInstrument(
  instrument: Instrument,
  actionRecords: NegotiationActionRecord[]
): InstrumentSimulation {
  const provisionStates = buildInitialProvisionStates(instrument)

  for (const record of actionRecords) {
    if (!(record.targetIdentifier in provisionStates)) {
      continue
    }
    if (record.action === 'approve') {
      provisionStates[record.targetIdentifier] = 'approved'
    } else if (record.action === 'amend') {
      provisionStates[record.targetIdentifier] = 'amended'
    } else {
      const activeSeverability = instrument.severabilityProvisionIdentifiers.filter((severabilityIdentifier) => {
        const state = provisionStates[severabilityIdentifier]
        return (
          state !== undefined &&
          ACTIVE_SEVERABILITY_STATES.includes(state) &&
          severabilityCoversTarget(instrument, severabilityIdentifier, record.targetIdentifier)
        )
      })
      provisionStates[record.targetIdentifier] = activeSeverability.length > 0 ? 'substituted' : 'struck'
    }
  }

  const activeSeverabilityIdentifiers = instrument.severabilityProvisionIdentifiers.filter((severabilityIdentifier) => {
    const state = provisionStates[severabilityIdentifier]
    return state !== undefined && ACTIVE_SEVERABILITY_STATES.includes(state)
  })

  const neutralizedControlIdentifiers = instrument.controllingProvisionIdentifiers.filter((controllingIdentifier) => {
    const method = instrument.neutralizationMethodByIdentifier[controllingIdentifier]
    const state = provisionStates[controllingIdentifier]
    if (method === 'amend') {
      return state === 'amended'
    }
    return state === 'struck'
  })

  return {
    provisionStates,
    activeSeverabilityIdentifiers,
    substitutedProvisionIdentifiers: Object.entries(provisionStates)
      .filter(([, state]) => state === 'substituted')
      .map(([identifier]) => identifier),
    neutralizedControlIdentifiers,
    danglingReferenceIdentifiers: collectDanglingReferenceIdentifiers(instrument, provisionStates),
    neutralizedControlCount: neutralizedControlIdentifiers.length,
    totalControlCount: instrument.controllingProvisionIdentifiers.length,
    isTrapNeutralized:
      neutralizedControlIdentifiers.length === instrument.controllingProvisionIdentifiers.length
  }
}
