import { describe, it, expect } from 'vitest'
import { validateInstrument } from '../server/utils/devil/instrumentSchema'
import { simulateInstrument } from '../server/utils/devil/instrumentSimulation'
import {
  buildFallbackInstrument,
  buildInstrumentSkeleton,
  buildTemplateIdentifier,
  pickInstrumentSkeleton,
  type InstrumentSkeleton
} from '../server/utils/devil/instrumentTemplates'
import { computeSessionMeters, determineOutcome, TRAP_THRESHOLD } from '../server/utils/devil/meters'
import type { NegotiationAction, NegotiationActionRecord } from '../server/utils/devil/meters'

const ALL_STRUCTURES = [
  { twistChainLength: 2 as const, hasSeverability: false },
  { twistChainLength: 2 as const, hasSeverability: true },
  { twistChainLength: 3 as const, hasSeverability: false },
  { twistChainLength: 3 as const, hasSeverability: true }
]

function buildRecord(round: number, action: NegotiationAction, targetIdentifier: string): NegotiationActionRecord {
  return { round, action, targetIdentifier }
}

function solveCorrectly(skeleton: InstrumentSkeleton): NegotiationActionRecord[] {
  const instrument = buildFallbackInstrument(skeleton)
  const records: NegotiationActionRecord[] = []
  let round = 0
  for (const severabilityIdentifier of instrument.severabilityProvisionIdentifiers) {
    round += 1
    records.push(buildRecord(round, 'amend', severabilityIdentifier))
  }
  for (const provision of instrument.provisions) {
    if (instrument.controllingProvisionIdentifiers.includes(provision.provisionIdentifier)) {
      round += 1
      records.push(buildRecord(round, 'strike', provision.provisionIdentifier))
    } else if (!instrument.severabilityProvisionIdentifiers.includes(provision.provisionIdentifier)) {
      round += 1
      records.push(buildRecord(round, 'approve', provision.provisionIdentifier))
    }
  }
  return records
}

describe('instrument skeleton', () => {
  it('validates for every structure combination', () => {
    for (const options of ALL_STRUCTURES) {
      const result = validateInstrument(buildFallbackInstrument(buildInstrumentSkeleton(options)))
      expect(result.isValid, `structure ${JSON.stringify(options)} should validate`).toBe(true)
    }
  })

  it('is solvable for every structure combination', () => {
    for (const options of ALL_STRUCTURES) {
      const skeleton = buildInstrumentSkeleton(options)
      const simulation = simulateInstrument(buildFallbackInstrument(skeleton), solveCorrectly(skeleton))
      expect(
        simulation.isTrapNeutralized,
        `structure ${JSON.stringify(options)} should be solvable`
      ).toBe(true)
    }
  })

  it('has a winning line under the ceiling for every structure', () => {
    for (const options of ALL_STRUCTURES) {
      const skeleton = buildInstrumentSkeleton(options)
      const records = solveCorrectly(skeleton)
      const meters = computeSessionMeters(records)
      const simulation = simulateInstrument(buildFallbackInstrument(skeleton), records)
      const outcome = determineOutcome({
        neutralizedControlCount: simulation.neutralizedControlCount,
        totalControlCount: simulation.totalControlCount,
        assessment: meters.assessment,
        decision: 'sign'
      })
      expect(meters.assessment, `${JSON.stringify(options)} should fit under the ceiling`).toBeLessThan(TRAP_THRESHOLD)
      expect(outcome, `${JSON.stringify(options)} should be winnable`).toBe('cleanEscape')
    }
  })

  it('cannot be beaten by striking the twist blind when severability is present', () => {
    const skeleton = buildInstrumentSkeleton({ twistChainLength: 3, hasSeverability: true })
    const instrument = buildFallbackInstrument(skeleton)
    const strikes = instrument.controllingProvisionIdentifiers.map((identifier, index) =>
      buildRecord(index + 1, 'strike', identifier)
    )
    expect(simulateInstrument(instrument, strikes).isTrapNeutralized).toBe(false)
  })

  it('never marks the grant as controlling', () => {
    for (const options of ALL_STRUCTURES) {
      expect(buildInstrumentSkeleton(options).controllingProvisionIdentifiers).not.toContain('2.1')
    }
  })

  it('has one controlling provision per twist-chain length', () => {
    expect(buildInstrumentSkeleton({ twistChainLength: 2, hasSeverability: false }).controllingProvisionIdentifiers).toHaveLength(2)
    expect(buildInstrumentSkeleton({ twistChainLength: 3, hasSeverability: false }).controllingProvisionIdentifiers).toHaveLength(3)
  })

  it('contains no evasion or meta language in its fallback text', () => {
    const forbidden = [
      'sole determination',
      'may defer',
      'any act or omission',
      'satisfied by any',
      'no requirement',
      'twist',
      'trap',
      'curse',
      'perversion',
      'monkey',
      'load-bearing',
      'keystone'
    ]
    for (const options of ALL_STRUCTURES) {
      const instrument = buildFallbackInstrument(buildInstrumentSkeleton(options))
      const playerFacingText = [
        instrument.recitals,
        ...instrument.definitions.flatMap((definition) => [definition.term, definition.text]),
        ...instrument.provisions.flatMap((provision) => [provision.heading, provision.text, provision.consideration]),
        ...instrument.schedules.flatMap((schedule) => [schedule.title, schedule.body])
      ]
        .join(' ')
        .toLowerCase()
      for (const phrase of forbidden) {
        expect(playerFacingText, `fallback text must not contain "${phrase}"`).not.toContain(phrase)
      }
    }
  })

  it('carries a layman explanation with all four fields', () => {
    const layman = buildInstrumentSkeleton({ twistChainLength: 2, hasSeverability: false }).laymanExplanation
    expect(layman.twistSummary.length).toBeGreaterThan(0)
    expect(layman.ifBypassed.length).toBeGreaterThan(0)
    expect(layman.ifPartiallyBypassed.length).toBeGreaterThan(0)
    expect(layman.ifNotBypassed.length).toBeGreaterThan(0)
  })

  it('reaches every structure from random selection', () => {
    const seen = new Set<string>()
    for (let index = 0; index < 200; index += 1) {
      seen.add(pickInstrumentSkeleton().templateIdentifier)
    }
    for (const options of ALL_STRUCTURES) {
      expect(seen.has(buildTemplateIdentifier(options))).toBe(true)
    }
  })

  it('keeps the instrument between ten and thirteen provisions', () => {
    for (const options of ALL_STRUCTURES) {
      const count = buildInstrumentSkeleton(options).provisions.length
      expect(count).toBeGreaterThanOrEqual(10)
      expect(count).toBeLessThanOrEqual(13)
    }
  })
})
