import { describe, it, expect } from 'vitest'
import { simulateInstrument, findUnresolvedProvisionIdentifiers } from '../server/utils/devil/instrumentSimulation'
import { buildFallbackInstrument, buildInstrumentSkeleton } from '../server/utils/devil/instrumentTemplates'
import type { NegotiationAction, NegotiationActionRecord } from '../server/utils/devil/meters'

function buildRecord(round: number, action: NegotiationAction, targetIdentifier: string): NegotiationActionRecord {
  return { round, action, targetIdentifier }
}

describe('simulateInstrument — severability', () => {
  const instrument = buildFallbackInstrument(
    buildInstrumentSkeleton({ twistChainLength: 3, hasSeverability: true })
  )

  it('substitutes a struck twist provision while severability is live', () => {
    const simulation = simulateInstrument(instrument, [buildRecord(1, 'strike', '6.1')])
    expect(simulation.provisionStates['6.1']).toBe('substituted')
    expect(simulation.isTrapNeutralized).toBe(false)
    expect(simulation.neutralizedControlCount).toBe(0)
  })

  it('neutralizes after the severability provision is amended', () => {
    const simulation = simulateInstrument(instrument, [
      buildRecord(1, 'amend', '9.1'),
      buildRecord(2, 'strike', '6.1'),
      buildRecord(3, 'strike', '6.2'),
      buildRecord(4, 'strike', '6.3')
    ])
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
    expect(simulation.danglingReferenceIdentifiers).toContain('9.1')
  })
})

describe('simulateInstrument — plain instrument', () => {
  const instrument = buildFallbackInstrument(
    buildInstrumentSkeleton({ twistChainLength: 3, hasSeverability: false })
  )

  it('neutralizes when every twist provision is struck', () => {
    const simulation = simulateInstrument(instrument, [
      buildRecord(1, 'strike', '6.1'),
      buildRecord(2, 'strike', '6.2'),
      buildRecord(3, 'strike', '6.3')
    ])
    expect(simulation.isTrapNeutralized).toBe(true)
    expect(simulation.neutralizedControlCount).toBe(3)
  })

  it('is partial when only some are neutralized', () => {
    const simulation = simulateInstrument(instrument, [buildRecord(1, 'strike', '6.1')])
    expect(simulation.neutralizedControlCount).toBe(1)
    expect(simulation.totalControlCount).toBe(3)
    expect(simulation.isTrapNeutralized).toBe(false)
  })

  it('ignores actions against unknown identifiers', () => {
    const simulation = simulateInstrument(instrument, [buildRecord(1, 'strike', '99.9')])
    expect(simulation.neutralizedControlCount).toBe(0)
  })

  it('never treats the grant as a controlling provision', () => {
    expect(instrument.controllingProvisionIdentifiers).not.toContain('2.1')
  })
})

describe('substitution source', () => {
  const instrument = buildFallbackInstrument(
    buildInstrumentSkeleton({ twistChainLength: 3, hasSeverability: true })
  )

  it('records which severability provision reissued the struck clause', () => {
    const simulation = simulateInstrument(instrument, [buildRecord(1, 'strike', '6.1')])
    expect(simulation.substitutionSourceByIdentifier['6.1']).toBe('9.1')
  })

  it('records no source for a clean strike', () => {
    const plain = buildFallbackInstrument(
      buildInstrumentSkeleton({ twistChainLength: 2, hasSeverability: false })
    )
    const simulation = simulateInstrument(plain, [buildRecord(1, 'strike', '6.1')])
    expect(simulation.substitutionSourceByIdentifier['6.1']).toBeUndefined()
  })
})

describe('findUnresolvedProvisionIdentifiers', () => {
  const instrument = buildFallbackInstrument(
    buildInstrumentSkeleton({ twistChainLength: 2, hasSeverability: false })
  )

  it('lists every provision with no disposition', () => {
    const simulation = simulateInstrument(instrument, [])
    expect(findUnresolvedProvisionIdentifiers(instrument, simulation)).toHaveLength(instrument.provisions.length)
  })

  it('is empty once every provision is dispositioned', () => {
    const records = instrument.provisions.map((provision, index) =>
      buildRecord(index + 1, 'approve', provision.provisionIdentifier)
    )
    const simulation = simulateInstrument(instrument, records)
    expect(findUnresolvedProvisionIdentifiers(instrument, simulation)).toHaveLength(0)
  })

  it('still lists the provisions that were left untouched', () => {
    const firstProvision = instrument.provisions[0].provisionIdentifier
    const simulation = simulateInstrument(instrument, [buildRecord(1, 'approve', firstProvision)])
    const unresolved = findUnresolvedProvisionIdentifiers(instrument, simulation)
    expect(unresolved).not.toContain(firstProvision)
    expect(unresolved.length).toBe(instrument.provisions.length - 1)
  })
})
