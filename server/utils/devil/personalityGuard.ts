import type { Contract } from './contractSchema'

export const PERSONALITY_KEYS = ['tenuredClerk', 'actuary', 'auditor'] as const
export type PersonalityKey = (typeof PERSONALITY_KEYS)[number]

const PERSONALITY_LABELS: Record<PersonalityKey, string> = {
  tenuredClerk: 'the tenured clerk',
  actuary: 'the actuary',
  auditor: 'the auditor'
}

const PERSONALITY_DESCRIPTOR_WORDS: Record<PersonalityKey, readonly string[]> = {
  tenuredClerk: ['tenured clerk'],
  actuary: ['actuary'],
  auditor: ['auditor']
}

function buildForbiddenTerms(personalityKey: PersonalityKey): string[] {
  const terms = [
    personalityKey,
    PERSONALITY_LABELS[personalityKey],
    ...PERSONALITY_DESCRIPTOR_WORDS[personalityKey]
  ]
  return terms.sort((left, right) => right.length - left.length)
}

function buildAllForbiddenTerms(): string[] {
  const terms = PERSONALITY_KEYS.flatMap((personalityKey) => [
    personalityKey,
    PERSONALITY_LABELS[personalityKey],
    ...PERSONALITY_DESCRIPTOR_WORDS[personalityKey]
  ])
  return [...new Set(terms)].sort((left, right) => right.length - left.length)
}

const ALL_FORBIDDEN_TERMS = buildAllForbiddenTerms()

// Terms that give away which clause is load-bearing. Sentences containing them are dropped.
const KEYSTONE_LEAK_TERMS = ['keystone', 'load-bearing', 'load bearing']

function escapeForRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function removeSentencesContaining(text: string, terms: string[]): string {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const keptSentences = sentences.filter((sentence) => {
    const loweredSentence = sentence.toLowerCase()
    return !terms.some((term) => loweredSentence.includes(term.toLowerCase()))
  })
  return keptSentences.join(' ').trim()
}

function removeTerms(text: string, terms: string[]): string {
  let result = text
  for (const term of terms) {
    const pattern = new RegExp(escapeForRegularExpression(term), 'gi')
    result = result.replace(pattern, '')
  }
  result = result.replace(/\s+([.,;:])/g, '$1')
  result = result.replace(/\s{2,}/g, ' ')
  return result.trim()
}

function scrubPlayerFacingText(text: string, terms: string[]): string {
  return removeSentencesContaining(removeTerms(text, terms), KEYSTONE_LEAK_TERMS)
}

export function containsPersonalityLeak(playerFacingText: string, personalityKey: PersonalityKey): boolean {
  const lowered = playerFacingText.toLowerCase()
  return buildForbiddenTerms(personalityKey).some((term) => lowered.includes(term.toLowerCase()))
}

export function stripPersonalityLeak(playerFacingText: string, personalityKey: PersonalityKey): string {
  return scrubPlayerFacingText(playerFacingText, buildForbiddenTerms(personalityKey))
}

// Strips every known personality marker, not just the active one: a leak of any
// personality name would be a hint. The active key is accepted for call-site clarity.
export function sanitizeContract(contract: Contract, _personalityKey: PersonalityKey): Contract {
  return {
    preamble: scrubPlayerFacingText(contract.preamble, ALL_FORBIDDEN_TERMS),
    agentRemark: scrubPlayerFacingText(contract.agentRemark, ALL_FORBIDDEN_TERMS),
    clauses: contract.clauses.map((clause) => ({
      ...clause,
      text: scrubPlayerFacingText(clause.text, ALL_FORBIDDEN_TERMS),
      obviousCost: scrubPlayerFacingText(clause.obviousCost, ALL_FORBIDDEN_TERMS),
      hiddenCost: scrubPlayerFacingText(clause.hiddenCost, ALL_FORBIDDEN_TERMS)
    }))
  }
}
