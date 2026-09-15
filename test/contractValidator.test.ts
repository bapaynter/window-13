import { describe, it, expect } from 'vitest'
import { validateContract, parseContractJson } from '../server/utils/devil/contractValidator'

function buildValidClause(clauseIdentifier: number, isKeystone: boolean): unknown {
  return {
    clauseIdentifier,
    text: `Clause number ${clauseIdentifier}.`,
    category: 'term',
    obviousCost: 'A small obvious cost.',
    hiddenCost: 'A small hidden cost.',
    processingFee: 5,
    isKeystone
  }
}

function buildValidContract(): unknown {
  return {
    preamble: 'This agreement is entered into freely.',
    clauses: [
      buildValidClause(1, false),
      buildValidClause(2, true),
      buildValidClause(3, false),
      buildValidClause(4, false)
    ],
    agentRemark: 'Take a number.'
  }
}

describe('validateContract', () => {
  it('accepts a valid contract', () => {
    const result = validateContract(buildValidContract())
    expect(result.isValid).toBe(true)
    expect(result.contract?.clauses).toHaveLength(4)
  })

  it('rejects a contract with no keystone', () => {
    const candidate = buildValidContract() as { clauses: unknown[] }
    candidate.clauses = candidate.clauses.map((clause, position) =>
      buildValidClause(position + 1, false)
    )
    const result = validateContract(candidate)
    expect(result.isValid).toBe(false)
    expect(result.rejectionReason).toBe('keystone-count')
  })

  it('rejects a contract with two keystones', () => {
    const candidate = buildValidContract() as { clauses: unknown[] }
    candidate.clauses = [
      buildValidClause(1, true),
      buildValidClause(2, true),
      buildValidClause(3, false),
      buildValidClause(4, false)
    ]
    const result = validateContract(candidate)
    expect(result.isValid).toBe(false)
    expect(result.rejectionReason).toBe('keystone-count')
  })

  it('rejects a contract with too few clauses', () => {
    const candidate = buildValidContract() as { clauses: unknown[] }
    candidate.clauses = [buildValidClause(1, true), buildValidClause(2, false), buildValidClause(3, false)]
    const result = validateContract(candidate)
    expect(result.isValid).toBe(false)
    expect(result.rejectionReason).toBe('schema')
  })

  it('rejects a contract with too many clauses', () => {
    const candidate = buildValidContract() as { clauses: unknown[] }
    candidate.clauses = Array.from({ length: 8 }, (_value, index) =>
      buildValidClause(index + 1, index === 0)
    )
    const result = validateContract(candidate)
    expect(result.isValid).toBe(false)
    expect(result.rejectionReason).toBe('schema')
  })

  it('rejects a processing fee above the per-clause maximum', () => {
    const candidate = buildValidContract() as { clauses: Record<string, unknown>[] }
    candidate.clauses[0].processingFee = 41
    const result = validateContract(candidate)
    expect(result.isValid).toBe(false)
    expect(result.rejectionReason).toBe('schema')
  })

  it('rejects clause text above the maximum length', () => {
    const candidate = buildValidContract() as { clauses: Record<string, unknown>[] }
    candidate.clauses[0].text = 'x'.repeat(401)
    const result = validateContract(candidate)
    expect(result.isValid).toBe(false)
    expect(result.rejectionReason).toBe('schema')
  })

  it('rejects duplicate clause identifiers', () => {
    const candidate = buildValidContract() as { clauses: unknown[] }
    candidate.clauses = [
      buildValidClause(1, false),
      buildValidClause(1, true),
      buildValidClause(3, false),
      buildValidClause(4, false)
    ]
    const result = validateContract(candidate)
    expect(result.isValid).toBe(false)
    expect(result.rejectionReason).toBe('duplicate-identifier')
  })

  it('rejects a missing agent remark', () => {
    const candidate = buildValidContract() as Record<string, unknown>
    delete candidate.agentRemark
    const result = validateContract(candidate)
    expect(result.isValid).toBe(false)
    expect(result.rejectionReason).toBe('schema')
  })

  it('rejects non-object input', () => {
    expect(validateContract(null).isValid).toBe(false)
    expect(validateContract('contract').isValid).toBe(false)
    expect(validateContract(42).isValid).toBe(false)
  })
})

describe('parseContractJson', () => {
  it('parses and validates a JSON contract body', () => {
    const result = parseContractJson(JSON.stringify(buildValidContract()))
    expect(result.isValid).toBe(true)
  })

  it('fails gracefully on invalid JSON', () => {
    const result = parseContractJson('not json at all')
    expect(result.isValid).toBe(false)
    expect(result.rejectionReason).toBe('unparseable')
  })

  it('extracts JSON wrapped in prose or code fences', () => {
    const wrapped = 'Here is the contract:\n```json\n' + JSON.stringify(buildValidContract()) + '\n```'
    const result = parseContractJson(wrapped)
    expect(result.isValid).toBe(true)
  })
})
