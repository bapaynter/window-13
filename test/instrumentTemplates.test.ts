import { describe, it, expect } from 'vitest'
import { validateInstrument } from '../server/utils/devil/instrumentSchema'
import { simulateInstrument } from '../server/utils/devil/instrumentSimulation'
import { buildFallbackInstrument, INSTRUMENT_TEMPLATES, pickInstrumentTemplate } from '../server/utils/devil/instrumentTemplates'
import type { InstrumentSkeleton } from '../server/utils/devil/instrumentTemplates'
import type { NegotiationAction, NegotiationActionRecord } from '../server/utils/devil/meters'

function buildRecord(
  round: number,
  action: NegotiationAction,
  targetIdentifier: string
): NegotiationActionRecord {
  return { round, action, targetIdentifier, processingFee: 0 }
}

function solveCorrectly(skeleton: InstrumentSkeleton): NegotiationActionRecord[] {
  const instrument = buildFallbackInstrument(skeleton)
  const records: NegotiationActionRecord[] = []
  let round = 0
  for (const severabilityIdentifier of instrument.severabilityProvisionIdentifiers) {
    round += 1
    records.push(buildRecord(round, 'amend', severabilityIdentifier))
  }
  for (const controllingIdentifier of instrument.controllingProvisionIdentifiers) {
    const method = instrument.neutralizationMethodByIdentifier[controllingIdentifier]
    round += 1
    records.push(buildRecord(round, method, controllingIdentifier))
  }
  return records
}

function strikeEverything(skeleton: InstrumentSkeleton): NegotiationActionRecord[] {
  const instrument = buildFallbackInstrument(skeleton)
  const targets = [
    ...instrument.severabilityProvisionIdentifiers,
    ...instrument.controllingProvisionIdentifiers
  ]
  return targets.map((targetIdentifier, index) => buildRecord(index + 1, 'strike', targetIdentifier))
}

describe('instrument templates', () => {
  it('ships five archetypes with unique identifiers', () => {
    const identifiers = INSTRUMENT_TEMPLATES.map((template) => template.templateIdentifier)
    expect(new Set(identifiers).size).toBe(identifiers.length)
    expect(identifiers.length).toBe(5)
  })

  it('every template assembles into a valid instrument', () => {
    for (const template of INSTRUMENT_TEMPLATES) {
      const result = validateInstrument(buildFallbackInstrument(template))
      expect(result.isValid, `template ${template.templateIdentifier} should validate`).toBe(true)
    }
  })

  it('every template has a correct solution that neutralizes the trap', () => {
    for (const template of INSTRUMENT_TEMPLATES) {
      const instrument = buildFallbackInstrument(template)
      const simulation = simulateInstrument(instrument, solveCorrectly(template))
      expect(
        simulation.isTrapNeutralized,
        `template ${template.templateIdentifier} should be solvable`
      ).toBe(true)
    }
  })

  it('every template has at least one controlling provision and a method for each', () => {
    for (const template of INSTRUMENT_TEMPLATES) {
      const instrument = buildFallbackInstrument(template)
      expect(instrument.controllingProvisionIdentifiers.length).toBeGreaterThan(0)
      for (const controllingIdentifier of instrument.controllingProvisionIdentifiers) {
        expect(instrument.neutralizationMethodByIdentifier[controllingIdentifier]).toBeDefined()
      }
    }
  })

  it('striking everything fails on templates that require amendment', () => {
    for (const templateIdentifier of ['definedTerm', 'severability']) {
      const template = INSTRUMENT_TEMPLATES.find(
        (candidate) => candidate.templateIdentifier === templateIdentifier
      )
      if (template === undefined) {
        throw new Error(`template not found: ${templateIdentifier}`)
      }
      const simulation = simulateInstrument(buildFallbackInstrument(template), strikeEverything(template))
      expect(simulation.isTrapNeutralized, `${templateIdentifier} should not be beatable by striking everything`).toBe(false)
    }
  })

  it('ships around eighteen provisions per instrument', () => {
    for (const template of INSTRUMENT_TEMPLATES) {
      const instrument = buildFallbackInstrument(template)
      expect(instrument.provisions.length).toBeGreaterThanOrEqual(16)
      expect(instrument.provisions.length).toBeLessThanOrEqual(20)
    }
  })

  it('random selection reaches every template', () => {
    const seen = new Set<string>()
    for (let index = 0; index < 200; index += 1) {
      seen.add(pickInstrumentTemplate().templateIdentifier)
    }
    expect(seen.size).toBe(INSTRUMENT_TEMPLATES.length)
  })
})
