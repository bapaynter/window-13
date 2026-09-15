import { z } from 'zod'

export const CLAUSE_CATEGORIES = ['delivery', 'consideration', 'waiver', 'term'] as const
export const MINIMUM_CLAUSE_COUNT = 4
export const MAXIMUM_CLAUSE_COUNT = 7
export const MAXIMUM_PROCESSING_FEE_PER_CLAUSE = 40
export const MAXIMUM_CLAUSE_LENGTH = 400

export const clauseSchema = z.object({
  clauseIdentifier: z.number().int().positive(),
  text: z.string().min(1).max(MAXIMUM_CLAUSE_LENGTH),
  category: z.enum(CLAUSE_CATEGORIES),
  obviousCost: z.string().min(1),
  hiddenCost: z.string().min(1),
  processingFee: z.number().int().min(0).max(MAXIMUM_PROCESSING_FEE_PER_CLAUSE),
  isKeystone: z.boolean()
})

export const contractSchema = z.object({
  preamble: z.string().min(1),
  clauses: z
    .array(clauseSchema)
    .min(MINIMUM_CLAUSE_COUNT)
    .max(MAXIMUM_CLAUSE_COUNT),
  agentRemark: z.string().min(1)
})

export type Clause = z.infer<typeof clauseSchema>
export type Contract = z.infer<typeof contractSchema>
