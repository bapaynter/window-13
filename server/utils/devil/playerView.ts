import type { Instrument, ProvisionMechanism } from './instrumentSchema'

export interface PlayerDefinition {
  definitionIdentifier: string
  term: string
  text: string
  references: string[]
}

export interface PlayerProvision {
  provisionIdentifier: string
  sectionNumber: string
  heading: string
  text: string
  references: string[]
  consideration: string
  mechanism: ProvisionMechanism
}

export interface PlayerSchedule {
  scheduleIdentifier: string
  title: string
  body: string
  referencedBy: string[]
}

export interface PlayerInstrument {
  recitals: string
  definitions: PlayerDefinition[]
  provisions: PlayerProvision[]
  schedules: PlayerSchedule[]
}

export type ProvisionTextOverrides = Record<string, string>

// Control flags (controlling provisions, neutralization methods, severability
// coverage, trap summary) stay server-side. Exposing them would hand over the answer.
// Overrides carry the effective text of amended or substituted provisions.
export function toPlayerInstrument(
  instrument: Instrument,
  overrides: ProvisionTextOverrides = {}
): PlayerInstrument {
  return {
    recitals: instrument.recitals,
    definitions: instrument.definitions.map((definition) => ({
      definitionIdentifier: definition.definitionIdentifier,
      term: definition.term,
      text: definition.text,
      references: definition.references
    })),
    provisions: instrument.provisions.map((provision) => ({
      provisionIdentifier: provision.provisionIdentifier,
      sectionNumber: provision.sectionNumber,
      heading: provision.heading,
      text: overrides[provision.provisionIdentifier] ?? provision.text,
      references: provision.references,
      consideration: provision.consideration,
      mechanism: provision.mechanism
    })),
    schedules: instrument.schedules.map((schedule) => ({
      scheduleIdentifier: schedule.scheduleIdentifier,
      title: schedule.title,
      body: schedule.body,
      referencedBy: schedule.referencedBy
    }))
  }
}
