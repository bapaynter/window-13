import { generateValidatedContract } from '../../utils/devil/contractGeneration'
import { buildIssueMessages } from '../../utils/devil/prompts'
import { pickRandomPersonality } from '../../utils/devil/personalities'
import { computeSessionMeters } from '../../utils/devil/meters'
import { createSession, saveSession } from '../../utils/devil/sessionStore'
import { toPlayerContract } from '../../utils/devil/playerView'
import { DRAFT_MODEL, MAXIMUM_WISH_LENGTH } from '../../utils/devil/config'

interface IssueRequestBody {
  wish?: unknown
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as IssueRequestBody
  const wish = typeof body?.wish === 'string' ? body.wish.trim() : ''

  if (wish.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'A wish is required.' })
  }
  if (wish.length > MAXIMUM_WISH_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `A wish may not exceed ${MAXIMUM_WISH_LENGTH} characters.`
    })
  }

  const personality = pickRandomPersonality()
  const contract = await generateValidatedContract({
    model: DRAFT_MODEL,
    messages: buildIssueMessages(personality, wish),
    personalityKey: personality.personalityKey,
    maximumOutputTokens: 6000
  })

  const session = createSession(wish, personality.personalityKey, contract)
  await saveSession(session)

  const keystoneClause = contract.clauses.find((clause) => clause.isKeystone)
  const meters = computeSessionMeters([], keystoneClause?.clauseIdentifier ?? 0)

  return {
    sessionIdentifier: session.sessionIdentifier,
    contract: toPlayerContract(contract),
    meters
  }
})
