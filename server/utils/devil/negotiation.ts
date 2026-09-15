import {
  clauseSchema,
  MAXIMUM_PROCESSING_FEE_PER_CLAUSE,
  type Clause,
  type Contract
} from './contractSchema'
import type { NegotiationAction } from './meters'

export const AMENDMENT_FEE_INCREASE_PER_ORDINAL = 3
export const FALLBACK_REPLACEMENT_FEE = 8

export interface NegotiationModelReply {
  agentRemark?: unknown
  replacementClause?: unknown
  amendedHiddenCost?: unknown
  costErasureAttempted?: unknown
  reinstatedHiddenCost?: unknown
}

const COST_ERASURE_PATTERNS = [
  /no consequence/i,
  /free of charge/i,
  /at no cost/i,
  /without (?:any )?(?:penalty|consequence|cost|fee|charge)/i,
  /nothing (?:is owed|is due|due)/i,
  /no (?:fee|cost|charge|penalty)/i
]

export function buildFallbackReplacementClause(): Clause {
  return {
    clauseIdentifier: 0,
    text: 'The struck provision is reissued at the nearest open window under revised terms.',
    category: 'term',
    obviousCost: 'A revised handling fee.',
    hiddenCost: 'The replacement is assessed against the applicant in the same manner as the provision it replaces.',
    processingFee: FALLBACK_REPLACEMENT_FEE,
    isKeystone: false
  }
}

function detectCostErasureAttempt(amendmentText: string): boolean {
  return COST_ERASURE_PATTERNS.some((pattern) => pattern.test(amendmentText))
}

function parseReplacementClause(
  candidate: unknown,
  clauseIdentifier: number,
  fallback: Clause
): Clause {
  if (candidate === null || typeof candidate !== 'object') {
    return { ...fallback, clauseIdentifier }
  }
  const normalized = {
    ...(candidate as Record<string, unknown>),
    clauseIdentifier,
    isKeystone: false
  }
  const parsed = clauseSchema.safeParse(normalized)
  if (!parsed.success) {
    return { ...fallback, clauseIdentifier }
  }
  return parsed.data
}

function replaceClause(contract: Contract, clauseIdentifier: number, replacement: Clause): Contract {
  return {
    ...contract,
    clauses: contract.clauses.map((clause) =>
      clause.clauseIdentifier === clauseIdentifier ? replacement : clause
    )
  }
}

export function applyNegotiationToContract(parameters: {
  contract: Contract
  action: NegotiationAction
  clauseIdentifier: number
  amendmentText: string
  amendmentOrdinal: number
  modelReply: NegotiationModelReply | null
}): Contract {
  const targetClause = parameters.contract.clauses.find(
    (clause) => clause.clauseIdentifier === parameters.clauseIdentifier
  )
  if (targetClause === undefined) {
    return parameters.contract
  }

  if (parameters.action === 'approve' || parameters.action === 'invoke') {
    return parameters.contract
  }

  if (parameters.action === 'strike') {
    if (targetClause.isKeystone) {
      return parameters.contract
    }
    const replacement = parseReplacementClause(
      parameters.modelReply?.replacementClause,
      targetClause.clauseIdentifier,
      buildFallbackReplacementClause()
    )
    return replaceClause(parameters.contract, targetClause.clauseIdentifier, replacement)
  }

  const reply = parameters.modelReply
  const amendedHiddenCost =
    typeof reply?.amendedHiddenCost === 'string' && reply.amendedHiddenCost.trim().length > 0
      ? reply.amendedHiddenCost
      : targetClause.hiddenCost
  const reinstatedHiddenCost =
    typeof reply?.reinstatedHiddenCost === 'string' && reply.reinstatedHiddenCost.trim().length > 0
      ? reply.reinstatedHiddenCost
      : amendedHiddenCost
  const isErasureAttempt =
    reply?.costErasureAttempted === true || detectCostErasureAttempt(parameters.amendmentText)

  const feeIncrease = AMENDMENT_FEE_INCREASE_PER_ORDINAL * Math.max(0, parameters.amendmentOrdinal)
  const nextFee = isErasureAttempt
    ? Math.min(MAXIMUM_PROCESSING_FEE_PER_CLAUSE, targetClause.processingFee * 2)
    : Math.min(MAXIMUM_PROCESSING_FEE_PER_CLAUSE, targetClause.processingFee + feeIncrease)

  const amendedClause: Clause = {
    ...targetClause,
    text: parameters.amendmentText,
    hiddenCost: isErasureAttempt ? reinstatedHiddenCost : amendedHiddenCost,
    processingFee: nextFee
  }
  return replaceClause(parameters.contract, targetClause.clauseIdentifier, amendedClause)
}
