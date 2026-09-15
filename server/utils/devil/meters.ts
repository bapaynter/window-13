export const TRAP_THRESHOLD = 60
export const SURCHARGE_PER_STRIKE_ORDINAL = 5
export const SURCHARGE_PER_AMENDMENT_ORDINAL = 3
export const MAXIMUM_METER_VALUE = 100

export type NegotiationAction = 'approve' | 'strike' | 'amend'
export type SignatureDecision = 'sign' | 'walk'
export type Outcome = 'cleanEscape' | 'trapped' | 'partial' | 'literalHell' | 'draw'

export interface NegotiationActionRecord {
  round: number
  action: NegotiationAction
  targetIdentifier: string
  processingFee: number
  amendmentText?: string
}

export interface SessionMeters {
  processingFee: number
  administrativeSurcharge: number
  burden: number
}

function clampToMeterRange(value: number): number {
  return Math.max(0, Math.min(MAXIMUM_METER_VALUE, value))
}

export function computeSessionMeters(actionRecords: NegotiationActionRecord[]): SessionMeters {
  const processingFee = actionRecords
    .filter((record) => record.action === 'approve')
    .reduce((total, record) => total + record.processingFee, 0)

  let strikeCount = 0
  let amendmentCount = 0
  let administrativeSurcharge = 0

  for (const record of actionRecords) {
    if (record.action === 'strike') {
      strikeCount += 1
      administrativeSurcharge += SURCHARGE_PER_STRIKE_ORDINAL * strikeCount
    } else if (record.action === 'amend') {
      amendmentCount += 1
      administrativeSurcharge += SURCHARGE_PER_AMENDMENT_ORDINAL * amendmentCount
    }
  }

  const boundedProcessingFee = clampToMeterRange(processingFee)
  const boundedAdministrativeSurcharge = clampToMeterRange(administrativeSurcharge)

  return {
    processingFee: boundedProcessingFee,
    administrativeSurcharge: boundedAdministrativeSurcharge,
    burden: clampToMeterRange(boundedProcessingFee + boundedAdministrativeSurcharge)
  }
}

export function determineOutcome(parameters: {
  neutralizedControlCount: number
  totalControlCount: number
  burden: number
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
  if (parameters.burden < TRAP_THRESHOLD) {
    return 'cleanEscape'
  }
  return 'trapped'
}
