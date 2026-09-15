import { buildNegotiateMessages } from '../../utils/devil/prompts'
import { PERSONALITY_PROFILES } from '../../utils/devil/personalities'
import { stripPersonalityLeak, sanitizeContract } from '../../utils/devil/personalityGuard'
import { computeSessionMeters, type NegotiationAction } from '../../utils/devil/meters'
import { loadSession, saveSession } from '../../utils/devil/sessionStore'
import { MAXIMUM_AMENDMENT_LENGTH, NEGOTIATE_MODEL } from '../../utils/devil/config'
import { requestCompletion } from '../../utils/devil/openrouter'
import { parseJsonObject } from '../../utils/devil/modelJson'
import { applyNegotiationToContract, type NegotiationModelReply } from '../../utils/devil/negotiation'
import { toPlayerContract } from '../../utils/devil/playerView'

const ALLOWED_ACTIONS: NegotiationAction[] = ['approve', 'strike', 'amend', 'invoke']

interface NegotiateRequestBody {
  sessionIdentifier?: unknown
  action?: unknown
  clauseIdentifier?: unknown
  amendmentText?: unknown
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as NegotiateRequestBody
  const sessionIdentifier = typeof body?.sessionIdentifier === 'string' ? body.sessionIdentifier : ''
  const action = typeof body?.action === 'string' ? (body.action as NegotiationAction) : 'approve'
  const clauseIdentifier = typeof body?.clauseIdentifier === 'number' ? body.clauseIdentifier : -1
  const amendmentText = typeof body?.amendmentText === 'string' ? body.amendmentText.trim() : ''

  if (sessionIdentifier.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'A session identifier is required.' })
  }
  if (!ALLOWED_ACTIONS.includes(action)) {
    throw createError({ statusCode: 400, statusMessage: 'That action is not recognized.' })
  }
  if (action === 'amend' && amendmentText.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'An amendment requires replacement wording.' })
  }
  if (amendmentText.length > MAXIMUM_AMENDMENT_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `An amendment may not exceed ${MAXIMUM_AMENDMENT_LENGTH} characters.`
    })
  }

  const session = await loadSession(sessionIdentifier)
  if (session === null) {
    throw createError({ statusCode: 404, statusMessage: 'No such filing.' })
  }

  const targetClause = session.currentContract.clauses.find(
    (clause) => clause.clauseIdentifier === clauseIdentifier
  )
  if (targetClause === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'No such clause on this contract.' })
  }

  const processingFee = action === 'approve' ? targetClause.processingFee : 0
  const nextActionRecords = [
    ...session.actionRecords,
    { round: session.actionRecords.length + 1, action, clauseIdentifier, processingFee }
  ]

  const priorAmendmentCount = session.actionRecords.filter((record) => record.action === 'amend').length
  const amendmentOrdinal = action === 'amend' ? priorAmendmentCount + 1 : priorAmendmentCount

  const personality = PERSONALITY_PROFILES[session.personalityKey]
  const actionSummary = buildActionSummary(action, targetClause.processingFee)

  let agentRemark = 'Processed.'
  let modelReply: NegotiationModelReply | null = null

  try {
    const rawReply = await requestCompletion({
      model: NEGOTIATE_MODEL,
      messages: buildNegotiateMessages(personality, {
        contract: session.currentContract,
        action,
        clauseIdentifier,
        amendmentText,
        actionSummary
      }),
      jsonMode: true,
      maximumOutputTokens: 2500
    })
    modelReply = parseJsonObject<NegotiationModelReply>(rawReply)
    if (modelReply && typeof modelReply.agentRemark === 'string') {
      agentRemark = stripPersonalityLeak(modelReply.agentRemark, session.personalityKey)
    }
  } catch (error) {
    console.error('negotiate: model call failed', error)
  }

  const mutatedContract = applyNegotiationToContract({
    contract: session.currentContract,
    action,
    clauseIdentifier,
    amendmentText,
    amendmentOrdinal,
    modelReply
  })
  const nextContract = sanitizeContract({ ...mutatedContract, agentRemark }, session.personalityKey)

  const nextSession = {
    ...session,
    currentContract: nextContract,
    actionRecords: nextActionRecords
  }
  await saveSession(nextSession)

  const keystoneClause = nextContract.clauses.find((clause) => clause.isKeystone)
  const meters = computeSessionMeters(nextActionRecords, keystoneClause?.clauseIdentifier ?? 0)

  const revealedHiddenCosts =
    action === 'invoke'
      ? nextContract.clauses.map((clause) => ({
          clauseIdentifier: clause.clauseIdentifier,
          hiddenCost: clause.hiddenCost
        }))
      : undefined

  return {
    actionRecords: nextActionRecords,
    contract: toPlayerContract(nextContract),
    meters,
    agentRemark,
    revealedHiddenCosts
  }
})

function buildActionSummary(action: NegotiationAction, processingFee: number): string {
  if (action === 'approve') {
    return `The applicant accepted the clause; a processing fee of ${processingFee} is added to the balance.`
  }
  if (action === 'strike') {
    return 'The applicant struck the clause. If it is not load-bearing, the office reissues a replacement at once and the surcharge applies.'
  }
  if (action === 'invoke') {
    return 'The applicant spent an available credit to compel a full disclosure of concealed costs.'
  }
  return 'The applicant replaced the clause with their own wording; the office honours it literally and the surcharge applies.'
}
