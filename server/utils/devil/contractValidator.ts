import { contractSchema, type Contract } from './contractSchema'

export type ContractRejectionReason =
  | 'schema'
  | 'keystone-count'
  | 'duplicate-identifier'
  | 'unparseable'
  | 'not-an-object'

export interface ContractValidationResult {
  isValid: boolean
  contract?: Contract
  rejectionReason?: ContractRejectionReason
}

export function validateContract(candidate: unknown): ContractValidationResult {
  if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { isValid: false, rejectionReason: 'not-an-object' }
  }

  const parsed = contractSchema.safeParse(candidate)
  if (!parsed.success) {
    return { isValid: false, rejectionReason: 'schema' }
  }

  const contract = parsed.data
  const clauseIdentifiers = contract.clauses.map((clause) => clause.clauseIdentifier)
  if (new Set(clauseIdentifiers).size !== clauseIdentifiers.length) {
    return { isValid: false, rejectionReason: 'duplicate-identifier' }
  }

  const keystoneCount = contract.clauses.filter((clause) => clause.isKeystone).length
  if (keystoneCount !== 1) {
    return { isValid: false, rejectionReason: 'keystone-count' }
  }

  return { isValid: true, contract }
}

function extractJsonObject(rawText: string): string | null {
  const firstBrace = rawText.indexOf('{')
  const lastBrace = rawText.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null
  }
  return rawText.slice(firstBrace, lastBrace + 1)
}

export function parseContractJson(rawText: string): ContractValidationResult {
  const jsonBody = extractJsonObject(rawText)
  if (jsonBody === null) {
    return { isValid: false, rejectionReason: 'unparseable' }
  }

  try {
    const parsed: unknown = JSON.parse(jsonBody)
    return validateContract(parsed)
  } catch {
    return { isValid: false, rejectionReason: 'unparseable' }
  }
}
