import { buildNegotiateMessages } from '../../utils/devil/prompts'
import { PERSONALITY_PROFILES } from '../../utils/devil/personalities'
import { scrubAllPersonalityLeaks } from '../../utils/devil/personalityGuard'
import { computeSessionMeters, type NegotiationAction } from '../../utils/devil/meters'
import { simulateInstrument } from '../../utils/devil/instrumentSimulation'
import { loadSession, saveSession } from '../../utils/devil/sessionStore'
import { MAXIMUM_AMENDMENT_LENGTH, NEGOTIATE_MODEL } from '../../utils/devil/config'
import { requestCompletion } from '../../utils/devil/openrouter'
import { parseJsonObject } from '../../utils/devil/modelJson'
import { toPlayerInstrument } from '../../utils/devil/playerView'

const ALLOWED_ACTIONS: NegotiationAction[] = ['approve', 'strike', 'amend']

interface NegotiateRequestBody {
  sessionIdentifier?: unknown
  action?: unknown
  targetIdentifier?: unknown
  amendmentText?: unknown
}

interface NegotiateModelReply {
  agentRemark?: unknown
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as NegotiateRequestBody
  const sessionIdentifier = typeof body?.sessionIdentifier === 'string' ? body.sessionIdentifier : ''
  const action = typeof body?.action === 'string' ? (body.action as NegotiationAction) : 'approve'
  const targetIdentifier = typeof body?.targetIdentifier === 'string' ? body.targetIdentifier : ''
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

  const targetProvision = session.instrument.provisions.find(
    (provision) => provision.provisionIdentifier === targetIdentifier
  )
  if (targetProvision === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'No such provision in this instrument.' })
  }

  const processingFee = action === 'approve' ? targetProvision.processingFee : 0
  const nextActionRecords = [
    ...session.actionRecords,
    {
      round: session.actionRecords.length + 1,
      action,
      targetIdentifier,
      processingFee,
      ...(action === 'amend' ? { amendmentText } : {})
    }
  ]

  const personality = PERSONALITY_PROFILES[session.personalityKey]
  let agentRemark = 'Processed.'

  try {
    const rawReply = await requestCompletion({
      model: NEGOTIATE_MODEL,
      messages: buildNegotiateMessages(personality, {
        action,
        targetIdentifier,
        heading: targetProvision.heading,
        amendmentText,
        actionSummary: buildActionSummary(action, processingFee)
      }),
      jsonMode: true,
      maximumOutputTokens: 2000
    })
    const reply = parseJsonObject<NegotiateModelReply>(rawReply)
    if (reply && typeof reply.agentRemark === 'string' && reply.agentRemark.trim().length > 0) {
      agentRemark = scrubAllPersonalityLeaks(reply.agentRemark)
    }
  } catch (error) {
    console.error('negotiate: model call failed', error)
  }

  const nextSession = {
    ...session,
    actionRecords: nextActionRecords
  }
  await saveSession(nextSession)

  const simulation = simulateInstrument(session.instrument, nextActionRecords)

  return {
    actionRecords: nextActionRecords,
    instrument: toPlayerInstrument(session.instrument),
    meters: computeSessionMeters(nextActionRecords),
    agentRemark,
    // Never expose which provisions control the outcome; only structural facts.
    simulation: {
      provisionStates: simulation.provisionStates,
      activeSeverabilityIdentifiers: simulation.activeSeverabilityIdentifiers,
      substitutedProvisionIdentifiers: simulation.substitutedProvisionIdentifiers,
      danglingReferenceIdentifiers: simulation.danglingReferenceIdentifiers
    }
  }
})

function buildActionSummary(action: NegotiationAction, processingFee: number): string {
  if (action === 'approve') {
    return `The applicant accepted the provision; a processing fee of ${processingFee} is added to the burden.`
  }
  if (action === 'strike') {
    return 'The applicant struck the provision. If any active severability provision covers it, the Department substitutes an equivalent term and the strike does not take effect.'
  }
  return 'The applicant replaced the provision with their own wording; the clause fee rises and the surcharge applies.'
}
