import { pickRandomPersonality } from '../../utils/devil/personalities'
import { pickInstrumentTemplate } from '../../utils/devil/instrumentTemplates'
import { generateInstrument } from '../../utils/devil/instrumentGeneration'
import { computeSessionMeters } from '../../utils/devil/meters'
import { createSession, saveSession } from '../../utils/devil/sessionStore'
import { toPlayerInstrument } from '../../utils/devil/playerView'
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
  const skeleton = pickInstrumentTemplate()
  const instrument = await generateInstrument({
    personality,
    skeleton,
    wish,
    model: DRAFT_MODEL,
    maximumOutputTokens: 12000
  })

  const session = createSession(wish, personality.personalityKey, skeleton.templateIdentifier, instrument)
  await saveSession(session)

  return {
    sessionIdentifier: session.sessionIdentifier,
    instrument: toPlayerInstrument(instrument),
    meters: computeSessionMeters([])
  }
})
