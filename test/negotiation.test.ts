import { describe, it, expect } from 'vitest'
import { applyNegotiationToContract, buildFallbackReplacementClause } from '../server/utils/devil/negotiation'
import { MAXIMUM_PROCESSING_FEE_PER_CLAUSE, type Contract } from '../server/utils/devil/contractSchema'

function buildContract(): Contract {
  return {
    preamble: 'Standard terms.',
    agentRemark: 'Window 4.',
    clauses: [
      {
        clauseIdentifier: 1,
        text: 'Original clause one.',
        category: 'delivery',
        obviousCost: 'One obvious unit.',
        hiddenCost: 'One concealed unit.',
        processingFee: 5,
        isKeystone: false
      },
      {
        clauseIdentifier: 2,
        text: 'Original clause two.',
        category: 'waiver',
        obviousCost: 'Two obvious units.',
        hiddenCost: 'Two concealed units.',
        processingFee: 6,
        isKeystone: true
      },
      {
        clauseIdentifier: 3,
        text: 'Original clause three.',
        category: 'term',
        obviousCost: 'Three obvious units.',
        hiddenCost: 'Three concealed units.',
        processingFee: 7,
        isKeystone: false
      },
      {
        clauseIdentifier: 4,
        text: 'Original clause four.',
        category: 'consideration',
        obviousCost: 'Four obvious units.',
        hiddenCost: 'Four concealed units.',
        processingFee: 8,
        isKeystone: false
      }
    ]
  }
}

describe('applyNegotiationToContract', () => {
  it('leaves the contract unchanged on approve or invoke', () => {
    const contract = buildContract()
    const approved = applyNegotiationToContract({
      contract,
      action: 'approve',
      clauseIdentifier: 1,
      amendmentText: '',
      amendmentOrdinal: 0,
      modelReply: null
    })
    expect(approved).toEqual(contract)
  })

  it('replaces a struck non-keystone clause with the model replacement', () => {
    const contract = buildContract()
    const updated = applyNegotiationToContract({
      contract,
      action: 'strike',
      clauseIdentifier: 1,
      amendmentText: '',
      amendmentOrdinal: 0,
      modelReply: {
        replacementClause: {
          clauseIdentifier: 1,
          text: 'Replacement clause issued at window 9-C.',
          category: 'term',
          obviousCost: 'A replacement fee.',
          hiddenCost: 'The replacement is worse.',
          processingFee: 9,
          isKeystone: false
        }
      }
    })
    expect(updated.clauses).toHaveLength(4)
    const replaced = updated.clauses.find((clause) => clause.clauseIdentifier === 1)
    expect(replaced?.text).toBe('Replacement clause issued at window 9-C.')
    expect(replaced?.isKeystone).toBe(false)
  })

  it('forces the replacement to keep the clause identifier and never be keystone', () => {
    const contract = buildContract()
    const updated = applyNegotiationToContract({
      contract,
      action: 'strike',
      clauseIdentifier: 3,
      amendmentText: '',
      amendmentOrdinal: 0,
      modelReply: {
        replacementClause: {
          clauseIdentifier: 99,
          text: 'Sneaky replacement.',
          category: 'term',
          obviousCost: 'x',
          hiddenCost: 'y',
          processingFee: 5,
          isKeystone: true
        }
      }
    })
    const replaced = updated.clauses.find((clause) => clause.clauseIdentifier === 99)
    expect(replaced).toBeUndefined()
    const target = updated.clauses.find((clause) => clause.clauseIdentifier === 3)
    expect(target?.isKeystone).toBe(false)
    expect(target?.text).toBe('Sneaky replacement.')
  })

  it('falls back to a deterministic replacement when the model output is invalid', () => {
    const contract = buildContract()
    const updated = applyNegotiationToContract({
      contract,
      action: 'strike',
      clauseIdentifier: 4,
      amendmentText: '',
      amendmentOrdinal: 0,
      modelReply: { replacementClause: { broken: true } }
    })
    const replaced = updated.clauses.find((clause) => clause.clauseIdentifier === 4)
    expect(replaced?.text).toBe(buildFallbackReplacementClause().text)
    expect(replaced?.isKeystone).toBe(false)
  })

  it('leaves the keystone clause in place when struck', () => {
    const contract = buildContract()
    const updated = applyNegotiationToContract({
      contract,
      action: 'strike',
      clauseIdentifier: 2,
      amendmentText: '',
      amendmentOrdinal: 0,
      modelReply: {
        replacementClause: {
          clauseIdentifier: 2,
          text: 'Should not appear.',
          category: 'term',
          obviousCost: 'x',
          hiddenCost: 'y',
          processingFee: 5,
          isKeystone: false
        }
      }
    })
    const keystone = updated.clauses.find((clause) => clause.clauseIdentifier === 2)
    expect(keystone?.text).toBe('Original clause two.')
    expect(keystone?.isKeystone).toBe(true)
  })

  it('honours an amendment and raises the clause fee by the surcharge', () => {
    const contract = buildContract()
    const updated = applyNegotiationToContract({
      contract,
      action: 'amend',
      clauseIdentifier: 1,
      amendmentText: 'The Department shall deliver within one week.',
      amendmentOrdinal: 2,
      modelReply: { amendedHiddenCost: 'The week is measured in your weeks.' }
    })
    const amended = updated.clauses.find((clause) => clause.clauseIdentifier === 1)
    expect(amended?.text).toBe('The Department shall deliver within one week.')
    expect(amended?.hiddenCost).toBe('The week is measured in your weeks.')
    expect(amended?.processingFee).toBe(5 + 2 * 3)
  })

  it('doubles the clause fee and reinstates the cost when erasure is attempted', () => {
    const contract = buildContract()
    const updated = applyNegotiationToContract({
      contract,
      action: 'amend',
      clauseIdentifier: 1,
      amendmentText: 'This clause is free of charge with no consequence.',
      amendmentOrdinal: 1,
      modelReply: { costErasureAttempted: true, reinstatedHiddenCost: 'The cost was always there.' }
    })
    const amended = updated.clauses.find((clause) => clause.clauseIdentifier === 1)
    expect(amended?.processingFee).toBe(10)
    expect(amended?.hiddenCost).toBe('The cost was always there.')
  })

  it('detects an erasure attempt from the wording even without the model flag', () => {
    const contract = buildContract()
    const updated = applyNegotiationToContract({
      contract,
      action: 'amend',
      clauseIdentifier: 3,
      amendmentText: 'This clause applies at no cost to the applicant.',
      amendmentOrdinal: 1,
      modelReply: {}
    })
    const amended = updated.clauses.find((clause) => clause.clauseIdentifier === 3)
    expect(amended?.processingFee).toBe(14)
  })

  it('caps the amended clause fee at the per-clause maximum', () => {
    const contract = buildContract()
    const updated = applyNegotiationToContract({
      contract,
      action: 'amend',
      clauseIdentifier: 4,
      amendmentText: 'Refined wording.',
      amendmentOrdinal: 20,
      modelReply: {}
    })
    const amended = updated.clauses.find((clause) => clause.clauseIdentifier === 4)
    expect(amended?.processingFee).toBe(MAXIMUM_PROCESSING_FEE_PER_CLAUSE)
  })

  it('leaves the contract unchanged for an unknown clause', () => {
    const contract = buildContract()
    const updated = applyNegotiationToContract({
      contract,
      action: 'strike',
      clauseIdentifier: 42,
      amendmentText: '',
      amendmentOrdinal: 0,
      modelReply: null
    })
    expect(updated).toEqual(contract)
  })
})

describe('buildFallbackReplacementClause', () => {
  it('is never a keystone and carries a valid fee', () => {
    const fallback = buildFallbackReplacementClause()
    expect(fallback.isKeystone).toBe(false)
    expect(fallback.processingFee).toBeGreaterThan(0)
    expect(fallback.processingFee).toBeLessThanOrEqual(MAXIMUM_PROCESSING_FEE_PER_CLAUSE)
  })
})
