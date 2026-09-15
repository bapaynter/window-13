import { describe, it, expect } from 'vitest'
import { simulateInstrument } from '../server/utils/devil/instrumentSimulation'
import { buildFallbackInstrument, INSTRUMENT_TEMPLATES } from '../server/utils/devil/instrumentTemplates'
import type { InstrumentSkeleton } from '../server/utils/devil/instrumentTemplates'
import type { NegotiationAction, NegotiationActionRecord } from '../server/utils/devil/meters'

function findTemplate(templateIdentifier: string): InstrumentSkeleton {
  const template = INSTRUMENT_TEMPLATES.find(
    (candidate) => candidate.templateIdentifier === templateIdentifier
  )
  if (template === undefined) {
    throw new Error(`template not found: ${templateIdentifier}`)
  }
  return template
}

function buildRecord(
  round: number,
  action: NegotiationAction,
  targetIdentifier: string
): NegotiationActionRecord {
  return { round, action, targetIdentifier, processingFee: 0 }
}

describe('simulateInstrument — severability', () => {
  const instrument = buildFallbackInstrument(findTemplate('severability'))

  it('substitutes a struck provision while severability is live', () => {
    const simulation = simulateInstrument(instrument, [buildRecord(1, 'strike', '6.1')])
    expect(simulation.provisionStates['6.1']).toBe('substituted')
    expect(simulation.isTrapNeutralized).toBe(false)
    expect(simulation.neutralizedControlCount).toBe(0)
  })

  it('neutralizes once the severability provision is amended', () => {
    const simulation = simulateInstrument(instrument, [
      buildRecord(1, 'amend', '9.1'),
      buildRecord(2, 'strike', '6.1')
    ])
    expect(simulation.provisionStates['6.1']).toBe('struck')
    expect(simulation.isTrapNeutralized).toBe(true)
    expect(simulation.activeSeverabilityIdentifiers).not.toContain('9.1')
  })

  it('keeps severability active when it is struck and substituted', () => {
    const simulation = simulateInstrument(instrument, [
      buildRecord(1, 'strike', '9.1'),
      buildRecord(2, 'strike', '6.1')
    ])
    expect(simulation.provisionStates['9.1']).toBe('substituted')
    expect(simulation.activeSeverabilityIdentifiers).toContain('9.1')
    expect(simulation.isTrapNeutralized).toBe(false)
  })

  it('reports dangling references for substituted provisions', () => {
    const simulation = simulateInstrument(instrument, [buildRecord(1, 'strike', '9.1')])
    expect(simulation.provisionStates['9.1']).toBe('substituted')
    expect(simulation.danglingReferenceIdentifiers).toContain('9.1')
  })
})

describe('simulateInstrument — amend-only provisions', () => {
  const instrument = buildFallbackInstrument(findTemplate('definedTerm'))

  it('does not neutralize an amend-only provision by striking it', () => {
    const simulation = simulateInstrument(instrument, [
      buildRecord(1, 'strike', '6.1'),
      buildRecord(2, 'strike', '6.2')
    ])
    expect(simulation.neutralizedControlIdentifiers).toEqual(['6.2'])
    expect(simulation.isTrapNeutralized).toBe(false)
  })

  it('neutralizes when the amend-only provision is amended', () => {
    const simulation = simulateInstrument(instrument, [
      buildRecord(1, 'amend', '6.1'),
      buildRecord(2, 'strike', '6.2')
    ])
    expect(simulation.isTrapNeutralized).toBe(true)
  })
})

describe('simulateInstrument — plain strike templates', () => {
  const instrument = buildFallbackInstrument(findTemplate('precedence'))

  it('neutralizes when both controlling provisions are struck', () => {
    const simulation = simulateInstrument(instrument, [
      buildRecord(1, 'strike', '6.1'),
      buildRecord(2, 'strike', '6.2')
    ])
    expect(simulation.isTrapNeutralized).toBe(true)
    expect(simulation.neutralizedControlCount).toBe(2)
  })

  it('is partial when only one is neutralized', () => {
    const simulation = simulateInstrument(instrument, [buildRecord(1, 'strike', '6.1')])
    expect(simulation.neutralizedControlCount).toBe(1)
    expect(simulation.totalControlCount).toBe(2)
    expect(simulation.isTrapNeutralized).toBe(false)
  })

  it('ignores actions against unknown identifiers', () => {
    const simulation = simulateInstrument(instrument, [buildRecord(1, 'strike', '99.9')])
    expect(simulation.neutralizedControlCount).toBe(0)
  })
})
