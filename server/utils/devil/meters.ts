export const TRAP_THRESHOLD = 20
export const SURCHARGE_PER_STRIKE = 4
export const SURCHARGE_PER_AMENDMENT = 3
export const MAXIMUM_METER_VALUE = 100

export type NegotiationAction = 'approve' | 'strike' | 'amend'
export type SignatureDecision = 'sign' | 'walk'
export type Outcome = 'cleanEscape' | 'trapped' | 'partial' | 'literalHell' | 'draw'

export interface NegotiationActionRecord {
  round: number
  action: NegotiationAction
  targetIdentifier: string
  amendmentText?: string
}

export interface SessionMeters {
  administrativeSurcharge: number
  assessment: number
}

function clampToMeterRange(value: number): number {
  return Math.max(0, Math.min(MAXIMUM_METER_VALUE, value))
}

// Approval is free. Only editing the Instrument (striking, amending) is assessed.
export function computeSessionMeters(actionRecords: NegotiationActionRecord[]): SessionMeters {
  const administrativeSurcharge = actionRecords.reduce((total, record) => {
    if (record.action === 'strike') {
      return total + SURCHARGE_PER_STRIKE
    }
    if (record.action === 'amend') {
      return total + SURCHARGE_PER_AMENDMENT
    }
    return total
  }, 0)

  const boundedSurcharge = clampToMeterRange(administrativeSurcharge)
  return {
    administrativeSurcharge: boundedSurcharge,
    assessment: boundedSurcharge
  }
}

export function determineOutcome(parameters: {
  neutralizedControlCount: number
  totalControlCount: number
  assessment: number
  decision: SignatureDecision
}): Outcome {
  if (parameters.decision === 'walk') {
    return 'draw'
  }
  if (parameters.totalControlCount > 0 && parameters.neutralizedControlCount === 0) {
    return 'literalHell'
  }
  if (parameters.neutralizedControlCount < parameters.totalControlCount) {
    return 'partial'
  }
  if (parameters.assessment < TRAP_THRESHOLD) {
    return 'cleanEscape'
  }
  return 'trapped'
}
