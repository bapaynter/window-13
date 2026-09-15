import { buildConcludeMessages } from '../../utils/devil/prompts'
import { PERSONALITY_PROFILES } from '../../utils/devil/personalities'
import { scrubAllPersonalityLeaks } from '../../utils/devil/personalityGuard'
import {
  computeSessionMeters,
  determineOutcome,
  type SignatureDecision
} from '../../utils/devil/meters'
import { simulateInstrument } from '../../utils/devil/instrumentSimulation'
import { buildFinalRecord } from '../../utils/devil/instrumentRecord'
import { loadSession, saveSession } from '../../utils/devil/sessionStore'
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

  const simulation = simulateInstrument(session.instrument, session.actionRecords)
  const meters = computeSessionMeters(session.actionRecords)
  const outcome = determineOutcome({
    neutralizedControlCount: simulation.neutralizedControlCount,
    totalControlCount: simulation.totalControlCount,
    burden: meters.burden,
    decision
  })

  const personality = PERSONALITY_PROFILES[session.personalityKey]
  let noticeText = 'The window is now closed.'

  const noticeMessages = buildConcludeMessages(personality, {
    wish: session.wish,
    outcome,
    trapSummary: session.instrument.trapSummary,
    neutralizedProvisionIdentifiers: simulation.neutralizedControlIdentifiers,
    controllingProvisionIdentifiers: session.instrument.controllingProvisionIdentifiers,
    meters
  })

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const rawReply = await requestCompletion({
        model: CONCLUDE_MODEL,
        messages: noticeMessages,
        jsonMode: true,
        maximumOutputTokens: 4000
      })
      const reply = parseJsonObject<ConcludeModelReply>(rawReply)
      if (reply && typeof reply.noticeText === 'string' && reply.noticeText.trim().length > 0) {
        noticeText = scrubAllPersonalityLeaks(reply.noticeText)
        break
      }
    } catch (error) {
      console.error('conclude: model call failed', error)
    }
  }

  const finalRecord = buildFinalRecord({
    instrument: session.instrument,
    actionRecords: session.actionRecords,
    simulation,
    meters,
    outcome
  })

  await saveSession({
    ...session,
    outcome,
    noticeText,
    finalMeters: meters,
    finalRecord
  })

  return { outcome, noticeText, meters, finalRecord }
})
