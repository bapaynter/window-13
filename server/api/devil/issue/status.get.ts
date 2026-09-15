import { loadSession, markGenerationFailed } from '../../../utils/devil/sessionStore'
import { toPlayerInstrument } from '../../../utils/devil/playerView'
import { computeSessionMeters } from '../../../utils/devil/meters'
import { GENERATION_STUCK_TIMEOUT_MILLISECONDS } from '../../../utils/devil/config'

export default defineEventHandler(async (event) => {
  const { sessionIdentifier } = getQuery(event)
  if (typeof sessionIdentifier !== 'string' || sessionIdentifier.length === 0) {
    return { status: 'unknown' }
  }

  const session = await loadSession(sessionIdentifier)
  if (session === null) {
    return { status: 'unknown' }
  }

  if (session.status === 'ready' && session.instrument !== undefined) {
    return {
      status: 'ready',
      instrument: toPlayerInstrument(session.instrument),
      meters: computeSessionMeters([])
    }
  }

  if (session.status === 'generating') {
    const age = Date.now() - Date.parse(session.updatedAt)
    if (Number.isFinite(age) && age > GENERATION_STUCK_TIMEOUT_MILLISECONDS) {
      await markGenerationFailed(sessionIdentifier, 'generation timed out')
      return { status: 'failed' }
    }
  }

  return { status: session.status }
})
