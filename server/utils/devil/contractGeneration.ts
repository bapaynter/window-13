import type { Contract } from './contractSchema'
import type { PersonalityKey } from './personalityGuard'
import { parseContractJson } from './contractValidator'
import { sanitizeContract } from './personalityGuard'
import { requestCompletion } from './openrouter'
import type { ChatMessage } from './prompts'

export function buildFallbackContract(): Contract {
  return {
    preamble:
      'This agreement is entered into voluntarily by the applicant and is effective upon signature at the window.',
    clauses: [
      {
        clauseIdentifier: 1,
        text: 'The Department will deliver the requested outcome within one standard processing period.',
        category: 'delivery',
        obviousCost: 'A handling fee of no consequence.',
        hiddenCost: 'The outcome arrives on a day you are not present to receive it.',
        processingFee: 6,
        isKeystone: false
      },
      {
        clauseIdentifier: 2,
        text: 'The applicant waives all objection to how the delivered outcome is interpreted.',
        category: 'waiver',
        obviousCost: 'None stated.',
        hiddenCost: 'Every word of the wish is read against you, in the most literal sense available.',
        processingFee: 4,
        isKeystone: true
      },
      {
        clauseIdentifier: 3,
        text: 'The Department retains a copy of the applicant record for its own use.',
        category: 'term',
        obviousCost: 'A routine file copy.',
        hiddenCost: 'The copy is the one that keeps existing.',
        processingFee: 5,
        isKeystone: false
      },
      {
        clauseIdentifier: 4,
        text: 'Consideration is settled in full at signature.',
        category: 'consideration',
        obviousCost: 'Consideration as stated above.',
        hiddenCost: 'Payment is drawn from a reserve the applicant does not know they hold.',
        processingFee: 7,
        isKeystone: false
      }
    ],
    agentRemark: 'Take a number. Next window.'
  }
}

export async function generateValidatedContract(parameters: {
  model: string
  messages: ChatMessage[]
  personalityKey: PersonalityKey
  maximumOutputTokens?: number
}): Promise<Contract> {
  const attempts = 2
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const rawText = await requestCompletion({
        model: parameters.model,
        messages: parameters.messages,
        jsonMode: true,
        maximumOutputTokens: parameters.maximumOutputTokens
      })
      const result = parseContractJson(rawText)
      if (result.isValid && result.contract) {
        return sanitizeContract(result.contract, parameters.personalityKey)
      }
    } catch (error) {
      console.error('generateValidatedContract: attempt failed', error)
    }
  }
  return sanitizeContract(buildFallbackContract(), parameters.personalityKey)
}
