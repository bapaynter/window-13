import { listFilings } from '../../utils/devil/sessionStore'

export default defineEventHandler(async () => {
  const filings = await listFilings()
  return { filings }
})
