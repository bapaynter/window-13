import { describe, it, expect } from 'vitest'
import { buildFinalRecord } from '../server/utils/devil/instrumentRecord'
import { simulateInstrument } from '../server/utils/devil/instrumentSimulation'
import { computeSessionMeters } from '../server/utils/devil/meters'
import { buildFallbackInstrument, buildInstrumentSkeleton } from '../server/utils/devil/instrumentTemplates'
import type { NegotiationAction, NegotiationActionRecord, Outcome } from '../server/utils/devil/meters'

function buildRecord(round: number, action: NegotiationAction, targetIdentifier: string): NegotiationActionRecord {
  return { round, action, targetIdentifier }
}

function buildRecordFor(
  options: { twistChainLength: 2 | 3; hasSeverability: boolean },
  records: NegotiationActionRecord[],
  outcome: Outcome
) {
  const instrument = buildFallbackInstrument(buildInstrumentSkeleton(options))
  const simulation = simulateInstrument(instrument, records)
  return buildFinalRecord({
    instrument,
    actionRecords: records,
    overrides: {},
    simulation,
    meters: computeSessionMeters(records),
    outcome
  })
}

describe('buildFinalRecord — layman outcome', () => {
  it('reports a full bypass with the strikes listed', () => {
    const record = buildRecordFor(
      { twistChainLength: 3, hasSeverability: false },
      [
        buildRecord(1, 'strike', '6.1'),
        buildRecord(2, 'strike', '6.2'),
        buildRecord(3, 'strike', '6.3')
      ],
      'cleanEscape'
    )
    expect(record.laymanOutcome.bypassStatus).toBe('all')
    expect(record.laymanOutcome.bypassDescription).toContain('§6.1')
    expect(record.laymanOutcome.effectOnWish.length).toBeGreaterThan(0)
    expect(record.laymanOutcome.twistSummary.length).toBeGreaterThan(0)
  })

  it('mentions the amended severability provision on a full bypass', () => {
    const record = buildRecordFor(
      { twistChainLength: 3, hasSeverability: true },
      [
        buildRecord(1, 'amend', '9.1'),
        buildRecord(2, 'strike', '6.1'),
        buildRecord(3, 'strike', '6.2'),
        buildRecord(4, 'strike', '6.3')
      ],
      'cleanEscape'
    )
    expect(record.laymanOutcome.bypassStatus).toBe('all')
    expect(record.laymanOutcome.bypassDescription).toContain('§9.1')
  })

  it('reports a partial bypass with what remains', () => {
    const record = buildRecordFor(
      { twistChainLength: 3, hasSeverability: false },
      [buildRecord(1, 'strike', '6.1')],
      'partial'
    )
    expect(record.laymanOutcome.bypassStatus).toBe('partial')
    expect(record.laymanOutcome.bypassDescription).toContain('§6.1')
    expect(record.laymanOutcome.bypassDescription).toContain('§6.2')
  })

  it('reports no bypass when nothing was neutralized', () => {
    const record = buildRecordFor({ twistChainLength: 2, hasSeverability: false }, [], 'literalHell')
    expect(record.laymanOutcome.bypassStatus).toBe('none')
    expect(record.laymanOutcome.bypassDescription).toContain('No provision was neutralized')
  })

  it('reports a withdrawal without granting the wish', () => {
    const record = buildRecordFor({ twistChainLength: 2, hasSeverability: false }, [], 'draw')
    expect(record.laymanOutcome.bypassStatus).toBe('draw')
    expect(record.laymanOutcome.effectOnWish).toContain('not granted')
  })
})
