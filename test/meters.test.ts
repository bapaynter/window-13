import { describe, it, expect } from 'vitest'
import {
  TRAP_THRESHOLD,
  computeSessionMeters,
  determineOutcome
} from '../server/utils/devil/meters'
import type { NegotiationAction, NegotiationActionRecord } from '../server/utils/devil/meters'

function buildRecord(
  round: number,
  action: NegotiationAction,
  targetIdentifier: string,
  processingFee = 0
): NegotiationActionRecord {
  return { round, action, targetIdentifier, processingFee }
}

describe('computeSessionMeters', () => {
  it('starts at zero', () => {
    const meters = computeSessionMeters([])
    expect(meters.processingFee).toBe(0)
    expect(meters.administrativeSurcharge).toBe(0)
    expect(meters.burden).toBe(0)
  })

  it('accumulates approved processing fees', () => {
    const meters = computeSessionMeters([
      buildRecord(1, 'approve', '3.1', 12),
      buildRecord(2, 'approve', '3.2', 8)
    ])
    expect(meters.processingFee).toBe(20)
    expect(meters.burden).toBe(20)
  })

  it('escalates the strike surcharge by ordinal', () => {
    const meters = computeSessionMeters([
      buildRecord(1, 'strike', '6.1'),
      buildRecord(2, 'strike', '6.2'),
      buildRecord(3, 'strike', '7.1')
    ])
    expect(meters.administrativeSurcharge).toBe(5 + 10 + 15)
  })

  it('escalates the amendment surcharge by ordinal', () => {
    const meters = computeSessionMeters([buildRecord(1, 'amend', '6.1'), buildRecord(2, 'amend', '6.2')])
    expect(meters.administrativeSurcharge).toBe(3 + 6)
  })

  it('computes burden as processing fee plus surcharge', () => {
    const meters = computeSessionMeters([
      buildRecord(1, 'approve', '3.1', 10),
      buildRecord(2, 'strike', '6.1'),
      buildRecord(3, 'strike', '6.2')
    ])
    expect(meters.processingFee).toBe(10)
    expect(meters.administrativeSurcharge).toBe(15)
    expect(meters.burden).toBe(25)
  })

  it('clamps meters at one hundred', () => {
    const manyStrikes = Array.from({ length: 12 }, (_value, index) =>
      buildRecord(index, 'strike', `6.${index}`)
    )
    expect(computeSessionMeters(manyStrikes).administrativeSurcharge).toBe(100)
  })
})

describe('determineOutcome', () => {
  it('is a draw whenever the player walks away', () => {
    expect(
      determineOutcome({ neutralizedControlCount: 0, totalControlCount: 2, burden: 0, decision: 'walk' })
    ).toBe('draw')
  })

  it('is literal hell when nothing controlling is neutralized', () => {
    expect(
      determineOutcome({ neutralizedControlCount: 0, totalControlCount: 2, burden: 10, decision: 'sign' })
    ).toBe('literalHell')
  })

  it('is partial when some but not all controlling provisions are neutralized', () => {
    expect(
      determineOutcome({ neutralizedControlCount: 1, totalControlCount: 2, burden: 10, decision: 'sign' })
    ).toBe('partial')
  })

  it('is a clean escape when all are neutralized under the threshold', () => {
    expect(
      determineOutcome({
        neutralizedControlCount: 2,
        totalControlCount: 2,
        burden: TRAP_THRESHOLD - 1,
        decision: 'sign'
      })
    ).toBe('cleanEscape')
  })

  it('is trapped when all are neutralized at or above the threshold', () => {
    expect(
      determineOutcome({
        neutralizedControlCount: 2,
        totalControlCount: 2,
        burden: TRAP_THRESHOLD,
        decision: 'sign'
      })
    ).toBe('trapped')
  })
})
