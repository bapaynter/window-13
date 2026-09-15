import { describe, it, expect } from 'vitest'
import {
  STARTING_AVAILABLE_CREDITS,
  TRAP_THRESHOLD,
  computeSessionMeters,
  determineOutcome
} from '../server/utils/devil/meters'
import type { NegotiationAction, NegotiationActionRecord } from '../server/utils/devil/meters'

function buildRecord(
  round: number,
  action: NegotiationAction,
  clauseIdentifier: number,
  processingFee = 0
): NegotiationActionRecord {
  return { round, action, clauseIdentifier, processingFee }
}

describe('computeSessionMeters', () => {
  it('starts at zero with full credits and zero burden', () => {
    const meters = computeSessionMeters([], 2)
    expect(meters.processingFee).toBe(0)
    expect(meters.administrativeSurcharge).toBe(0)
    expect(meters.availableCredits).toBe(STARTING_AVAILABLE_CREDITS)
    expect(meters.isKeystoneStruck).toBe(false)
    expect(meters.burden).toBe(0)
  })

  it('accumulates approved processing fees', () => {
    const meters = computeSessionMeters(
      [buildRecord(1, 'approve', 1, 12), buildRecord(2, 'approve', 3, 8)],
      2
    )
    expect(meters.processingFee).toBe(20)
    expect(meters.burden).toBe(20)
  })

  it('escalates the strike surcharge by ordinal', () => {
    const meters = computeSessionMeters(
      [buildRecord(1, 'strike', 1), buildRecord(2, 'strike', 3), buildRecord(3, 'strike', 4)],
      2
    )
    expect(meters.administrativeSurcharge).toBe(5 + 10 + 15)
  })

  it('escalates the amendment surcharge by ordinal', () => {
    const meters = computeSessionMeters([buildRecord(1, 'amend', 1), buildRecord(2, 'amend', 3)], 2)
    expect(meters.administrativeSurcharge).toBe(3 + 6)
  })

  it('adds a flat surcharge per invocation and spends credits', () => {
    const meters = computeSessionMeters([buildRecord(1, 'invoke', 1), buildRecord(2, 'invoke', 2)], 2)
    expect(meters.administrativeSurcharge).toBe(10)
    expect(meters.availableCredits).toBe(1)
  })

  it('computes burden as processing fee plus surcharge', () => {
    const meters = computeSessionMeters(
      [buildRecord(1, 'approve', 1, 10), buildRecord(2, 'strike', 3), buildRecord(3, 'strike', 4)],
      2
    )
    expect(meters.processingFee).toBe(10)
    expect(meters.administrativeSurcharge).toBe(15)
    expect(meters.burden).toBe(25)
  })

  it('flags the keystone as struck only when the keystone clause is struck', () => {
    expect(computeSessionMeters([buildRecord(1, 'strike', 2)], 2).isKeystoneStruck).toBe(true)
    expect(computeSessionMeters([buildRecord(1, 'strike', 3)], 2).isKeystoneStruck).toBe(false)
  })

  it('clamps meters at one hundred', () => {
    const manyStrikes = Array.from({ length: 12 }, (_value, index) =>
      buildRecord(index, 'strike', index + 1)
    )
    expect(computeSessionMeters(manyStrikes, 1).administrativeSurcharge).toBe(100)
  })
})

describe('determineOutcome', () => {
  it('is a draw whenever the player walks away', () => {
    expect(determineOutcome(computeSessionMeters([], 1), 'walk')).toBe('draw')
  })

  it('is literal hell when the keystone still stands', () => {
    const meters = computeSessionMeters([buildRecord(1, 'approve', 1, 10)], 2)
    expect(determineOutcome(meters, 'sign')).toBe('literalHell')
  })

  it('is a clean escape when the keystone is struck under the threshold', () => {
    const meters = computeSessionMeters(
      [buildRecord(1, 'approve', 1, 54), buildRecord(2, 'strike', 2)],
      2
    )
    expect(meters.burden).toBe(TRAP_THRESHOLD - 1)
    expect(determineOutcome(meters, 'sign')).toBe('cleanEscape')
  })

  it('is trapped when the keystone is struck at the threshold', () => {
    const meters = computeSessionMeters(
      [buildRecord(1, 'approve', 1, 55), buildRecord(2, 'strike', 2)],
      2
    )
    expect(meters.burden).toBe(TRAP_THRESHOLD)
    expect(determineOutcome(meters, 'sign')).toBe('trapped')
  })

  it('is trapped when surcharges alone cross the threshold', () => {
    const meters = computeSessionMeters(
      [
        buildRecord(1, 'strike', 2),
        buildRecord(2, 'strike', 1),
        buildRecord(3, 'strike', 3),
        buildRecord(4, 'strike', 4),
        buildRecord(5, 'strike', 5)
      ],
      2
    )
    expect(meters.burden).toBeGreaterThanOrEqual(TRAP_THRESHOLD)
    expect(determineOutcome(meters, 'sign')).toBe('trapped')
  })
})
