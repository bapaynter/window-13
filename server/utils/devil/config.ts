export const DEVIL_DATA_DIRECTORY =
  process.env.DEVIL_DATA_DIRECTORY ?? process.env.DEVIL_DATA_DIR ?? './data/sessions'
export const DEVIL_STATS_PATH = process.env.DEVIL_STATS_PATH ?? './data/generation-stats.json'
export const DRAFT_MODEL = process.env.DEVIL_DRAFT_MODEL ?? 'deepseek/deepseek-v4.1-flash'
export const NEGOTIATE_MODEL = process.env.DEVIL_NEGOTIATE_MODEL ?? 'deepseek/deepseek-v4.1-flash'
export const CONCLUDE_MODEL = process.env.DEVIL_CONCLUDE_MODEL ?? 'deepseek/deepseek-v4.1-flash'
export const MAXIMUM_WISH_LENGTH = 500
export const MAXIMUM_AMENDMENT_LENGTH = 400
export const DEPARTMENT_NAME = 'Department of Soul Registry'
// A session still generating after this long is treated as failed (for example if
// the server restarted mid-generation), so the applicant can refile rather than
// wait on a ticket that will never resolve.
export const GENERATION_STUCK_TIMEOUT_MILLISECONDS = 120000
