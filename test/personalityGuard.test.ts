import { describe, it, expect } from 'vitest'
import {
  PERSONALITY_KEYS,
  containsPersonalityLeak,
  stripPersonalityLeak,
  scrubAllPersonalityLeaks
} from '../server/utils/devil/personalityGuard'

describe('containsPersonalityLeak', () => {
  it('detects the internal key and label regardless of case', () => {
    expect(containsPersonalityLeak('I am the actuary assigned to you.', 'actuary')).toBe(true)
    expect(containsPersonalityLeak('The Auditor has reviewed this.', 'auditor')).toBe(true)
  })

  it('ignores unrelated text and the bare verb audit', () => {
    expect(containsPersonalityLeak('Take a number and have a seat.', 'auditor')).toBe(false)
    expect(containsPersonalityLeak('Your file will be audited.', 'auditor')).toBe(false)
  })

  it('guards all three keys', () => {
    expect(PERSONALITY_KEYS).toEqual(['tenuredClerk', 'actuary', 'auditor'])
  })
})

describe('stripPersonalityLeak', () => {
  it('removes the key and label from text', () => {
    const cleaned = stripPersonalityLeak('I am the actuary. The actuary is here.', 'actuary')
    expect(cleaned.toLowerCase()).not.toContain('actuary')
  })

  it('drops sentences that name control language', () => {
    const cleaned = stripPersonalityLeak('Clause 4 is the keystone here. Approval noted.', 'auditor')
    expect(cleaned.toLowerCase()).not.toContain('keystone')
    expect(cleaned).toContain('Approval noted.')
  })

  it('collapses leftover whitespace', () => {
    expect(stripPersonalityLeak('Hello tenuredClerk there.', 'tenuredClerk')).not.toMatch(/\s{2,}/)
  })
})

describe('scrubAllPersonalityLeaks', () => {
  it('removes every personality marker plus control language', () => {
    const scrubbed = scrubAllPersonalityLeaks(
      'The auditor and the actuary agree. The tenuredClerk notes the load-bearing clause.'
    )
    const lowered = scrubbed.toLowerCase()
    expect(lowered).not.toContain('auditor')
    expect(lowered).not.toContain('actuary')
    expect(lowered).not.toContain('tenuredclerk')
    expect(lowered).not.toContain('load-bearing')
  })
})
