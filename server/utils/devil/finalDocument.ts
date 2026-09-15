import type { Contract } from './contractSchema'
import type { NegotiationAction, NegotiationActionRecord, Outcome, SessionMeters } from './meters'
import { TRAP_THRESHOLD } from './meters'

export type ClauseDisposition = 'approved' | 'struck' | 'replaced' | 'amended' | 'untouched'

export interface FinalClauseDisposition {
  clauseIdentifier: number
  category: string
  text: string
  obviousCost: string
  hiddenCost: string
  processingFee: number
  isKeystone: boolean
  disposition: ClauseDisposition
  originalText?: string
  originalHiddenCost?: string
}

export interface FinalActionLogEntry {
  round: number
  action: NegotiationAction
  clauseIdentifier: number
  feeApplied: number
}

export interface FinalDocument {
  outcome: Outcome
  clauses: FinalClauseDisposition[]
  keystoneClauseIdentifier: number | null
  actionLog: FinalActionLogEntry[]
  processingFee: number
  administrativeSurcharge: number
  burden: number
  trapThreshold: number
}

function findLatestDispositionAction(
  actionRecords: NegotiationActionRecord[],
  clauseIdentifier: number
): NegotiationActionRecord | null {
  const matchingRecords = actionRecords.filter(
    (record) => record.clauseIdentifier === clauseIdentifier && record.action !== 'invoke'
  )
  const lastRecord = matchingRecords.at(-1)
  return lastRecord ?? null
}

function determineDisposition(
  isKeystone: boolean,
  latestAction: NegotiationActionRecord | null
): ClauseDisposition {
  if (latestAction === null) {
    return 'untouched'
  }
  if (latestAction.action === 'approve') {
    return 'approved'
  }
  if (latestAction.action === 'amend') {
    return 'amended'
  }
  if (latestAction.action === 'strike') {
    return isKeystone ? 'struck' : 'replaced'
  }
  return 'untouched'
}

export function buildFinalDocument(parameters: {
  initialContract: Contract
  finalContract: Contract
  actionRecords: NegotiationActionRecord[]
  meters: SessionMeters
  outcome: Outcome
}): FinalDocument {
  const keystoneClause = parameters.finalContract.clauses.find((clause) => clause.isKeystone)

  const clauses: FinalClauseDisposition[] = parameters.finalContract.clauses.map((clause) => {
    const initialClause = parameters.initialContract.clauses.find(
      (candidate) => candidate.clauseIdentifier === clause.clauseIdentifier
    )
    const latestAction = findLatestDispositionAction(parameters.actionRecords, clause.clauseIdentifier)
    const disposition = determineDisposition(clause.isKeystone, latestAction)
    const wasChanged =
      initialClause !== undefined &&
      (initialClause.text !== clause.text || initialClause.hiddenCost !== clause.hiddenCost)

    return {
      clauseIdentifier: clause.clauseIdentifier,
      category: clause.category,
      text: clause.text,
      obviousCost: clause.obviousCost,
      hiddenCost: clause.hiddenCost,
      processingFee: clause.processingFee,
      isKeystone: clause.isKeystone,
      disposition,
      ...(wasChanged && initialClause !== undefined
        ? { originalText: initialClause.text, originalHiddenCost: initialClause.hiddenCost }
        : {})
    }
  })

  return {
    outcome: parameters.outcome,
    clauses,
    keystoneClauseIdentifier: keystoneClause?.clauseIdentifier ?? null,
    actionLog: parameters.actionRecords.map((record) => ({
      round: record.round,
      action: record.action,
      clauseIdentifier: record.clauseIdentifier,
      feeApplied: record.processingFee
    })),
    processingFee: parameters.meters.processingFee,
    administrativeSurcharge: parameters.meters.administrativeSurcharge,
    burden: parameters.meters.burden,
    trapThreshold: TRAP_THRESHOLD
  }
}
