import { loadSession } from '../../../utils/devil/sessionStore'

export default defineEventHandler(async (event) => {
  const sessionIdentifier = getRouterParam(event, 'sessionIdentifier')
  if (typeof sessionIdentifier !== 'string' || sessionIdentifier.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'A filing identifier is required.' })
  }

  const session = await loadSession(sessionIdentifier)
  if (session === null || session.finalRecord === undefined) {
    throw createError({ statusCode: 404, statusMessage: 'No record on file for that filing.' })
  }

  return {
    wish: session.wish,
    noticeText: session.noticeText ?? '',
    finalRecord: session.finalRecord
  }
})
