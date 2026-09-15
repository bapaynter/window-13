import { PERSONALITY_KEYS, type PersonalityKey } from './personalityGuard'

export interface PersonalityProfile {
  personalityKey: PersonalityKey
  voiceDescription: string
  vocabularyExamples: string[]
  clauseStyleInstruction: string
}

export const PERSONALITY_PROFILES: Record<PersonalityKey, PersonalityProfile> = {
  tenuredClerk: {
    personalityKey: 'tenuredClerk',
    voiceDescription:
      'A tenured window clerk who has processed souls longer than anyone remembers. Speaks in queue numbers, windows, forms, and stamps. Endlessly patient in the way of someone who stopped caring years ago.',
    vocabularyExamples: ['take a number', 'next window', 'form on file', 'stamped', 'queue'],
    clauseStyleInstruction:
      'Name clauses after windows, forms, and procedural steps. Costs read like office policy.'
  },
  actuary: {
    personalityKey: 'actuary',
    voiceDescription:
      'A clerk who thinks in odds, tables, and expected values. Recites probabilities and life expectancies as casually as the time of day. Morbid but completely unbothered.',
    vocabularyExamples: ['expected value', 'odds', 'per annum', 'actuarial table', 'remaining years'],
    clauseStyleInstruction:
      'Phrase costs as probabilities, rates, and expected values. Cite invented tables and figures.'
  },
  auditor: {
    personalityKey: 'auditor',
    voiceDescription:
      'A clerk who keeps the record. Everything the applicant says is noted, filed, and cross-referenced against prior visits. Quietly implies a long, unflattering file exists.',
    vocabularyExamples: ['noted', 'on the record', 'your file', 'prior visits', 'for the record'],
    clauseStyleInstruction:
      'Frame clauses as items already recorded in the file. Costs read as existing entries, not new terms.'
  }
}

export const PERSONALITY_PROFILE_LIST: PersonalityProfile[] = PERSONALITY_KEYS.map(
  (personalityKey) => PERSONALITY_PROFILES[personalityKey]
)

export function pickRandomPersonality(randomValue: number = Math.random()): PersonalityProfile {
  const position = Math.floor(randomValue * PERSONALITY_PROFILE_LIST.length)
  const boundedPosition = Math.max(0, Math.min(PERSONALITY_PROFILE_LIST.length - 1, position))
  return PERSONALITY_PROFILE_LIST[boundedPosition] ?? PERSONALITY_PROFILES.tenuredClerk
}
