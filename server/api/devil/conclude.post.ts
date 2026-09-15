import { buildConcludeMessages } from '../../utils/devil/prompts'
import { PERSONALITY_PROFILES } from '../../utils/devil/personalities'
import { stripPersonalityLeak } from '../../utils/devil/personalityGuard'
import { computeSessionMeters, determineOutcome, type SignatureDecision } from '../../utils/devil/meters'
import { getInitialContract, loadSession, saveSession } from '../../utils/devil/sessionStore'
import { buildFinalDocument } from '../../utils/devil/finalDocument'
import { CONCLUDE_MODEL } from '../../utils/devil/config'
import { requestCompletion } from '../../utils/devil/openrouter'
import { parseJsonObject } from '../../utils/devil/modelJson'

interface ConcludeRequestBody {
  sessionIdentifier?: unknown
  decision?: unknown
}

interface ConcludeModelReply {
  noticeText?: unknown
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as ConcludeRequestBody
  const sessionIdentifier = typeof body?.sessionIdentifier === 'string' ? body.sessionIdentifier : ''
  const decision: SignatureDecision = body?.decision === 'walk' ? 'walk' : 'sign'

  if (sessionIdentifier.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'A session identifier is required.' })
  }

  const session = await loadSession(sessionIdentifier)
  if (session === null) {
    throw createError({ statusCode: 404, statusMessage: 'No such filing.' })
  }

  const keystoneClause = session.currentContract.clauses.find((clause) => clause.isKeystone)
  const meters = computeSessionMeters(session.actionRecords, keystoneClause?.clauseIdentifier ?? 0)
  const outcome = determineOutcome(meters, decision)

  const personality = PERSONALITY_PROFILES[session.personalityKey]
  let noticeText = 'The window is now closed.'

  try {
    const rawReply = await requestCompletion({
      model: CONCLUDE_MODEL,
      messages: buildConcludeMessages(personality, { wish: session.wish, outcome, meters }),
      jsonMode: true,
      maximumOutputTokens: 2500
    })
    const reply = parseJsonObject<ConcludeModelReply>(rawReply)
    if (reply && typeof reply.noticeText === 'string' && reply.noticeText.trim().length > 0) {
      noticeText = stripPersonalityLeak(reply.noticeText, session.personalityKey)
    }
  } catch (error) {
    console.error('conclude: model call failed', error)
  }

  const finalDocument = buildFinalDocument({
    initialContract: getInitialContract(session),
    finalContract: session.currentContract,
    actionRecords: session.actionRecords,
    meters,
    outcome
  })

  const finalizedSession = {
    ...session,
    outcome,
    noticeText,
    finalMeters: meters,
    finalDocument
  }
  await saveSession(finalizedSession)

  return {
    outcome,
    noticeText,
    meters,
    finalDocument
  }
})
