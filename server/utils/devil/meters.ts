export const STARTING_AVAILABLE_CREDITS = 3
export const TRAP_THRESHOLD = 60
export const SURCHARGE_PER_STRIKE_ORDINAL = 5
export const SURCHARGE_PER_AMENDMENT_ORDINAL = 3
export const SURCHARGE_PER_INVOCATION = 5
export const MAXIMUM_METER_VALUE = 100

export type NegotiationAction = 'approve' | 'strike' | 'amend' | 'invoke'
export type SignatureDecision = 'sign' | 'walk'
export type Outcome = 'cleanEscape' | 'trapped' | 'literalHell' | 'draw'

export interface NegotiationActionRecord {
  round: number
  action: NegotiationAction
  clauseIdentifier: number
  processingFee: number
}

export interface SessionMeters {
  processingFee: number
  administrativeSurcharge: number
  availableCredits: number
  isKeystoneStruck: boolean
  burden: number
}

function clampToMeterRange(value: number): number {
  return Math.max(0, Math.min(MAXIMUM_METER_VALUE, value))
}

export function computeSessionMeters(
  actionRecords: NegotiationActionRecord[],
  keystoneClauseIdentifier: number
): SessionMeters {
  const processingFee = actionRecords
    .filter((record) => record.action === 'approve')
    .reduce((total, record) => total + record.processingFee, 0)

  let strikeCount = 0
  let amendmentCount = 0
  let invocationCount = 0
  let administrativeSurcharge = 0

  for (const record of actionRecords) {
    if (record.action === 'strike') {
      strikeCount += 1
      administrativeSurcharge += SURCHARGE_PER_STRIKE_ORDINAL * strikeCount
    } else if (record.action === 'amend') {
      amendmentCount += 1
      administrativeSurcharge += SURCHARGE_PER_AMENDMENT_ORDINAL * amendmentCount
    } else if (record.action === 'invoke') {
      invocationCount += 1
      administrativeSurcharge += SURCHARGE_PER_INVOCATION
    }
  }

  const boundedProcessingFee = clampToMeterRange(processingFee)
  const boundedAdministrativeSurcharge = clampToMeterRange(administrativeSurcharge)
  const isKeystoneStruck = actionRecords.some(
    (record) => record.action === 'strike' && record.clauseIdentifier === keystoneClauseIdentifier
  )

  return {
    processingFee: boundedProcessingFee,
    administrativeSurcharge: boundedAdministrativeSurcharge,
    availableCredits: Math.max(0, STARTING_AVAILABLE_CREDITS - invocationCount),
    isKeystoneStruck,
    burden: clampToMeterRange(boundedProcessingFee + boundedAdministrativeSurcharge)
  }
}

export function determineOutcome(meters: SessionMeters, decision: SignatureDecision): Outcome {
  if (decision === 'walk') {
    return 'draw'
  }
  if (!meters.isKeystoneStruck) {
    return 'literalHell'
  }
  if (meters.burden < TRAP_THRESHOLD) {
    return 'cleanEscape'
  }
  return 'trapped'
}
