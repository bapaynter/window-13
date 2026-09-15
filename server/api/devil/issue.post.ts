import { randomUUID } from 'node:crypto'
import { pickRandomPersonality } from '../../utils/devil/personalities'
import { pickInstrumentSkeleton } from '../../utils/devil/instrumentTemplates'
import { generateInstrument } from '../../utils/devil/instrumentGeneration'
import {
  createSessionWithIdentifier,
  loadSession,
  markGenerationFailed,
  markGenerationReady,
  saveSession
} from '../../utils/devil/sessionStore'
import { DRAFT_MODEL, MAXIMUM_WISH_LENGTH } from '../../utils/devil/config'

interface IssueRequestBody {
  wish?: unknown
  sessionIdentifier?: unknown
}

const SESSION_IDENTIFIER_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as IssueRequestBody
  const wish = typeof body?.wish === 'string' ? body.wish.trim() : ''
  const requestedIdentifier =
    typeof body?.sessionIdentifier === 'string' ? body.sessionIdentifier.trim() : ''

  if (wish.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'A wish is required.' })
  }
  if (wish.length > MAXIMUM_WISH_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `A wish may not exceed ${MAXIMUM_WISH_LENGTH} characters.`
    })
  }

  const sessionIdentifier = SESSION_IDENTIFIER_PATTERN.test(requestedIdentifier)
    ? requestedIdentifier
    : randomUUID()

  // Idempotent: a retry or a reload during generation returns the current state
  // rather than starting a second generation.
  const existingSession = await loadSession(sessionIdentifier)
  if (existingSession !== null) {
    return { sessionIdentifier, status: existingSession.status }
  }

  const personality = pickRandomPersonality()
  const skeleton = pickInstrumentSkeleton()
  await saveSession(
    createSessionWithIdentifier(sessionIdentifier, wish, personality.personalityKey, skeleton.templateIdentifier)
  )

  // Deliberate ceiling: generation runs detached so the request returns at once,
  // which is what lets the waiting screen survive a reload. If the server restarts
  // mid-generation the session stays 'generating'; the waiting screen's abandon
  // path covers that case.
  void generateInstrument({
    personality,
    skeleton,
    wish,
    model: DRAFT_MODEL
  })
    .then((instrument) => markGenerationReady(sessionIdentifier, instrument))
    .catch((error) => {
      console.error('issue: background generation failed', error)
      return markGenerationFailed(sessionIdentifier, 'generation failed')
    })

  return { sessionIdentifier, status: 'generating' }
})
