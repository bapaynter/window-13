import { describe, it, expect } from 'vitest'
import {
  TRAP_THRESHOLD,
  SURCHARGE_PER_STRIKE,
  SURCHARGE_PER_AMENDMENT,
  computeSessionMeters,
  determineOutcome
} from '../server/utils/devil/meters'
import type { NegotiationAction, NegotiationActionRecord } from '../server/utils/devil/meters'

function buildRecord(
  round: number,
  action: NegotiationAction,
  targetIdentifier: string
): NegotiationActionRecord {
  return { round, action, targetIdentifier }
}

describe('computeSessionMeters', () => {
  it('starts at zero', () => {
    const meters = computeSessionMeters([])
    expect(meters.administrativeSurcharge).toBe(0)
    expect(meters.assessment).toBe(0)
  })

  it('does not assess approvals', () => {
    const meters = computeSessionMeters([
      buildRecord(1, 'approve', '2.1'),
      buildRecord(2, 'approve', '3.1')
    ])
    expect(meters.assessment).toBe(0)
  })

  it('assesses each strike at the flat rate', () => {
    const meters = computeSessionMeters([
      buildRecord(1, 'strike', '6.1'),
      buildRecord(2, 'strike', '6.2'),
      buildRecord(3, 'strike', '6.3')
    ])
    expect(meters.administrativeSurcharge).toBe(3 * SURCHARGE_PER_STRIKE)
    expect(meters.assessment).toBe(3 * SURCHARGE_PER_STRIKE)
  })

  it('assesses each amendment at the flat rate', () => {
    const meters = computeSessionMeters([buildRecord(1, 'amend', '9.1'), buildRecord(2, 'amend', '6.1')])
    expect(meters.administrativeSurcharge).toBe(2 * SURCHARGE_PER_AMENDMENT)
  })

  it('combines strikes and amendments', () => {
    const meters = computeSessionMeters([
      buildRecord(1, 'amend', '9.1'),
      buildRecord(2, 'strike', '6.1'),
      buildRecord(3, 'strike', '6.2'),
      buildRecord(4, 'strike', '6.3')
    ])
    expect(meters.assessment).toBe(SURCHARGE_PER_AMENDMENT + 3 * SURCHARGE_PER_STRIKE)
  })
})

describe('determineOutcome', () => {
  it('is a draw whenever the player walks away', () => {
    expect(
      determineOutcome({ neutralizedControlCount: 0, totalControlCount: 2, assessment: 0, decision: 'walk' })
    ).toBe('draw')
  })

  it('is literal hell when nothing is neutralized', () => {
    expect(
      determineOutcome({ neutralizedControlCount: 0, totalControlCount: 2, assessment: 5, decision: 'sign' })
    ).toBe('literalHell')
  })

  it('is partial when some are neutralized', () => {
    expect(
      determineOutcome({ neutralizedControlCount: 1, totalControlCount: 2, assessment: 5, decision: 'sign' })
    ).toBe('partial')
  })

  it('is a clean escape when all are neutralized under the ceiling', () => {
    expect(
      determineOutcome({
        neutralizedControlCount: 2,
        totalControlCount: 2,
        assessment: TRAP_THRESHOLD - 1,
        decision: 'sign'
      })
    ).toBe('cleanEscape')
  })

  it('is trapped when the assessment reaches the ceiling', () => {
    expect(
      determineOutcome({
        neutralizedControlCount: 2,
        totalControlCount: 2,
        assessment: TRAP_THRESHOLD,
        decision: 'sign'
      })
    ).toBe('trapped')
  })
})
