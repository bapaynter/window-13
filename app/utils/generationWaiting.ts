export const WAITING_STATUS_LINES = [
  'Locating an available agent for Window 13…',
  'Retrieving your record…',
  'Reviewing prior visits…',
  'Assigning a docket number…',
  'Consulting the schedule of fees…',
  'An agent will be with you shortly…'
] as const

const STATUS_LINE_INTERVAL_MILLISECONDS = 4000
const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60

export function selectWaitingStatusLine(elapsedMilliseconds: number): string {
  const boundedElapsed = Math.max(0, elapsedMilliseconds)
  const position = Math.floor(boundedElapsed / STATUS_LINE_INTERVAL_MILLISECONDS) % WAITING_STATUS_LINES.length
  return WAITING_STATUS_LINES[position] ?? WAITING_STATUS_LINES[0]
}

export function formatElapsedDuration(elapsedMilliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMilliseconds / MILLISECONDS_PER_SECOND))
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE)
  const seconds = totalSeconds % SECONDS_PER_MINUTE
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
