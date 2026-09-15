import { describe, it, expect } from 'vitest'
import { buildFinalDocument } from '../server/utils/devil/finalDocument'
import { computeSessionMeters, TRAP_THRESHOLD } from '../server/utils/devil/meters'
import type { NegotiationAction, NegotiationActionRecord } from '../server/utils/devil/meters'
import type { Contract } from '../server/utils/devil/contractSchema'

function buildInitialContract(): Contract {
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

function buildFinalContract(): Contract {
  const contract = buildInitialContract()
  contract.clauses[0] = { ...contract.clauses[0], text: 'Amended clause one.', processingFee: 8 }
  contract.clauses[2] = {
    ...contract.clauses[2],
    text: 'Replacement clause issued at window 9-C.',
    hiddenCost: 'The replacement is worse.'
  }
  return contract
}

function buildRecord(
  round: number,
  action: NegotiationAction,
  clauseIdentifier: number,
  processingFee = 0
): NegotiationActionRecord {
  return { round, action, clauseIdentifier, processingFee }
}

describe('buildFinalDocument', () => {
  const actionRecords: NegotiationActionRecord[] = [
    buildRecord(1, 'amend', 1),
    buildRecord(2, 'strike', 3),
    buildRecord(3, 'approve', 4, 8),
    buildRecord(4, 'strike', 2)
  ]
  const meters = computeSessionMeters(actionRecords, 2)

  function buildDocument() {
    return buildFinalDocument({
      initialContract: buildInitialContract(),
      finalContract: buildFinalContract(),
      actionRecords,
      meters,
      outcome: 'trapped'
    })
  }

  it('reveals the keystone clause identifier', () => {
    expect(buildDocument().keystoneClauseIdentifier).toBe(2)
  })

  it('marks an amended clause and retains its original text', () => {
    const amended = buildDocument().clauses.find((clause) => clause.clauseIdentifier === 1)
    expect(amended?.disposition).toBe('amended')
    expect(amended?.text).toBe('Amended clause one.')
    expect(amended?.originalText).toBe('Original clause one.')
    expect(amended?.processingFee).toBe(8)
  })

  it('marks a struck non-keystone clause as replaced and retains its original text', () => {
    const replaced = buildDocument().clauses.find((clause) => clause.clauseIdentifier === 3)
    expect(replaced?.disposition).toBe('replaced')
    expect(replaced?.text).toBe('Replacement clause issued at window 9-C.')
    expect(replaced?.originalText).toBe('Original clause three.')
    expect(replaced?.hiddenCost).toBe('The replacement is worse.')
    expect(replaced?.isKeystone).toBe(false)
  })

  it('marks a struck keystone clause as struck', () => {
    const struck = buildDocument().clauses.find((clause) => clause.clauseIdentifier === 2)
    expect(struck?.disposition).toBe('struck')
    expect(struck?.isKeystone).toBe(true)
    expect(struck?.hiddenCost).toBe('Two concealed units.')
  })

  it('marks an approved clause as approved', () => {
    const approved = buildDocument().clauses.find((clause) => clause.clauseIdentifier === 4)
    expect(approved?.disposition).toBe('approved')
  })

  it('reveals a concealed cost on every clause', () => {
    const document = buildDocument()
    expect(document.clauses.every((clause) => clause.hiddenCost.length > 0)).toBe(true)
  })

  it('carries the action log in order', () => {
    const document = buildDocument()
    expect(document.actionLog).toHaveLength(4)
    expect(document.actionLog[0]).toEqual({
      round: 1,
      action: 'amend',
      clauseIdentifier: 1,
      feeApplied: 0
    })
    expect(document.actionLog[2].feeApplied).toBe(8)
  })

  it('carries burden and threshold from the meters', () => {
    const document = buildDocument()
    expect(document.burden).toBe(meters.burden)
    expect(document.trapThreshold).toBe(TRAP_THRESHOLD)
    expect(document.processingFee).toBe(meters.processingFee)
    expect(document.administrativeSurcharge).toBe(meters.administrativeSurcharge)
  })

  it('never drops a clause', () => {
    expect(buildDocument().clauses).toHaveLength(buildInitialContract().clauses.length)
  })
})
