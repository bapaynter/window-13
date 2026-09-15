import { describe, it, expect } from 'vitest'
import {
  PERSONALITY_KEYS,
  containsPersonalityLeak,
  stripPersonalityLeak,
  sanitizeContract
} from '../server/utils/devil/personalityGuard'
import type { Contract } from '../server/utils/devil/contractSchema'

describe('containsPersonalityLeak', () => {
  it('detects the internal key', () => {
    expect(containsPersonalityLeak('I am the actuary assigned to you.', 'actuary')).toBe(true)
  })

  it('detects the human label regardless of case', () => {
    expect(containsPersonalityLeak('The Auditor has reviewed this.', 'auditor')).toBe(true)
  })

  it('ignores unrelated text', () => {
    expect(containsPersonalityLeak('Take a number and have a seat.', 'auditor')).toBe(false)
  })

  it('does not flag the bare verb audit for the auditor personality', () => {
    expect(containsPersonalityLeak('Your file will be audited.', 'auditor')).toBe(false)
  })
})

describe('stripPersonalityLeak', () => {
  it('removes the key and label from text', () => {
    const cleaned = stripPersonalityLeak('I am the actuary. The actuary is here.', 'actuary')
    expect(cleaned.toLowerCase()).not.toContain('actuary')
  })

  it('leaves clean prose untouched', () => {
    const original = 'Take a number and have a seat.'
    expect(stripPersonalityLeak(original, 'tenuredClerk')).toBe(original)
  })

  it('collapses leftover whitespace', () => {
    const cleaned = stripPersonalityLeak('Hello tenuredClerk there.', 'tenuredClerk')
    expect(cleaned).not.toMatch(/\s{2,}/)
  })
})

describe('keystone leak stripping', () => {
  it('drops sentences that name the load-bearing clause', () => {
    const cleaned = stripPersonalityLeak('Clause 4 is the keystone here. Approval noted.', 'auditor')
    expect(cleaned.toLowerCase()).not.toContain('keystone')
    expect(cleaned).toContain('Approval noted.')
  })

  it('drops load-bearing language from every contract field', () => {
    const contract: Contract = {
      preamble: 'The load-bearing clause is clause 2. This agreement is standard.',
      clauses: [
        {
          clauseIdentifier: 1,
          text: 'Keystone clause text.',
          category: 'term',
          obviousCost: 'Standard fee.',
          hiddenCost: 'A hidden load-bearing cost.',
          processingFee: 5,
          isKeystone: true
        }
      ],
      agentRemark: 'Noted.'
    }
    const cleaned = sanitizeContract(contract, 'auditor')
    const playerFacingValues = [
      cleaned.preamble,
      cleaned.agentRemark,
      ...cleaned.clauses.flatMap((clause) => [clause.text, clause.obviousCost, clause.hiddenCost])
    ]
      .join(' ')
      .toLowerCase()
    expect(playerFacingValues).not.toContain('keystone')
    expect(playerFacingValues).not.toContain('load-bearing')
    expect(playerFacingValues).toContain('this agreement is standard')
  })
})

describe('sanitizeContract', () => {
  it('cleans every player-facing field', () => {
    const contract: Contract = {
      preamble: 'The auditor greets you.',
      clauses: [
        {
          clauseIdentifier: 1,
          text: 'The actuary notes the auditor.',
          category: 'term',
          obviousCost: 'Stated by the tenuredClerk.',
          hiddenCost: 'Known to the auditor.',
          processingFee: 5,
          isKeystone: true
        }
      ],
      agentRemark: 'The tenuredClerk is bored.'
    }
    const cleaned = sanitizeContract(contract, 'auditor')
    const serialized = JSON.stringify(cleaned).toLowerCase()
    expect(serialized).not.toContain('auditor')
    expect(serialized).not.toContain('tenuredclerk')
  })

  it('exports the personality keys it guards', () => {
    expect(PERSONALITY_KEYS).toContain('tenuredClerk')
    expect(PERSONALITY_KEYS).toContain('actuary')
    expect(PERSONALITY_KEYS).toContain('auditor')
  })
})
