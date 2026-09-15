import type { Contract } from './contractSchema'

export interface PlayerClause {
  clauseIdentifier: number
  text: string
  category: string
  obviousCost: string
  hiddenCost: string
  processingFee: number
}

export interface PlayerContract {
  preamble: string
  clauses: PlayerClause[]
  agentRemark: string
}

// The keystone flag stays server-side; exposing it would let the player read the answer.
export function toPlayerContract(contract: Contract): PlayerContract {
  return {
    preamble: contract.preamble,
    agentRemark: contract.agentRemark,
    clauses: contract.clauses.map((clause) => ({
      clauseIdentifier: clause.clauseIdentifier,
      text: clause.text,
      category: clause.category,
      obviousCost: clause.obviousCost,
      hiddenCost: clause.hiddenCost,
      processingFee: clause.processingFee
    }))
  }
}
