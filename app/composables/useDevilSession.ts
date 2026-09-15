export interface DevilClause {
  clauseIdentifier: number
  text: string
  category: string
  obviousCost: string
  hiddenCost: string
  processingFee: number
}

export interface DevilContract {
  preamble: string
  clauses: DevilClause[]
  agentRemark: string
}

export interface DevilActionRecord {
  round: number
  action: 'approve' | 'strike' | 'amend' | 'invoke'
  clauseIdentifier: number
  processingFee: number
}

export interface DevilMeters {
  processingFee: number
  administrativeSurcharge: number
  availableCredits: number
  isKeystoneStruck: boolean
  burden: number
}

export interface DevilRevealedCost {
  clauseIdentifier: number
  hiddenCost: string
}

export type DevilOutcome = 'cleanEscape' | 'trapped' | 'literalHell' | 'draw'

export type ClauseDisposition = 'approved' | 'struck' | 'replaced' | 'amended' | 'untouched'

export interface FinalClauseDisposition {
  clauseIdentifier: number
  category: string
  text: string
  obviousCost: string
  hiddenCost: string
  processingFee: number
  isKeystone: boolean
  disposition: ClauseDisposition
  originalText?: string
  originalHiddenCost?: string
}

export interface FinalActionLogEntry {
  round: number
  action: DevilActionRecord['action']
  clauseIdentifier: number
  feeApplied: number
}

export interface FinalDocument {
  outcome: DevilOutcome
  clauses: FinalClauseDisposition[]
  keystoneClauseIdentifier: number | null
  actionLog: FinalActionLogEntry[]
  processingFee: number
  administrativeSurcharge: number
  burden: number
  trapThreshold: number
}

export interface ActiveDevilSession {
  sessionIdentifier: string
  wish: string
  contract: DevilContract
  actionRecords: DevilActionRecord[]
  meters: DevilMeters
  revealedHiddenCosts: DevilRevealedCost[]
}

export interface DevilNotice {
  outcome: DevilOutcome
  noticeText: string
  meters: DevilMeters
  finalDocument: FinalDocument
}

export interface AgentChatMessage {
  speaker: 'clerk' | 'applicant'
  text: string
}

const SESSION_STORAGE_KEY = 'soul-registry-active-session'
const NOTICE_STORAGE_KEY = 'soul-registry-last-notice'

export function useDevilSession() {
  const activeSession = useState<ActiveDevilSession | null>('activeDevilSession', () => null)
  const notice = useState<DevilNotice | null>('activeDevilNotice', () => null)
  const isBusy = useState<boolean>('activeDevilBusy', () => false)
  const errorMessage = useState<string>('activeDevilError', () => '')

  function persistSession(): void {
    if (!import.meta.client) {
      return
    }
    if (activeSession.value === null) {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      return
    }
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(activeSession.value))
  }

  function persistNotice(): void {
    if (!import.meta.client) {
      return
    }
    if (notice.value === null) {
      localStorage.removeItem(NOTICE_STORAGE_KEY)
      return
    }
    localStorage.setItem(NOTICE_STORAGE_KEY, JSON.stringify(notice.value))
  }

  function restoreSession(): void {
    if (!import.meta.client) {
      return
    }
    if (activeSession.value === null) {
      const rawSession = localStorage.getItem(SESSION_STORAGE_KEY)
      if (rawSession !== null) {
        try {
          activeSession.value = JSON.parse(rawSession) as ActiveDevilSession
        } catch {
          localStorage.removeItem(SESSION_STORAGE_KEY)
        }
      }
    }
    if (notice.value === null) {
      const rawNotice = localStorage.getItem(NOTICE_STORAGE_KEY)
      if (rawNotice !== null) {
        try {
          notice.value = JSON.parse(rawNotice) as DevilNotice
        } catch {
          localStorage.removeItem(NOTICE_STORAGE_KEY)
        }
      }
    }
  }

  function clearError(): void {
    errorMessage.value = ''
  }

  function resetSession(): void {
    activeSession.value = null
    notice.value = null
    errorMessage.value = ''
    persistSession()
    persistNotice()
  }

  async function startSession(wish: string): Promise<boolean> {
    isBusy.value = true
    clearError()
    try {
      const response = await $fetch<{
        sessionIdentifier: string
        contract: DevilContract
        meters: DevilMeters
      }>('/api/devil/issue', { method: 'POST', body: { wish } })

      activeSession.value = {
        sessionIdentifier: response.sessionIdentifier,
        wish,
        contract: response.contract,
        actionRecords: [],
        meters: response.meters,
        revealedHiddenCosts: []
      }
      notice.value = null
      persistSession()
      persistNotice()
      return true
    } catch (error) {
      errorMessage.value = 'The window rejected your submission. Please try again.'
      console.error('startSession failed', error)
      return false
    } finally {
      isBusy.value = false
    }
  }

  async function takeAction(
    action: DevilActionRecord['action'],
    clauseIdentifier: number,
    amendmentText = ''
  ): Promise<void> {
    if (activeSession.value === null) {
      return
    }
    isBusy.value = true
    clearError()
    try {
      const response = await $fetch<{
        actionRecords: DevilActionRecord[]
        contract: DevilContract
        meters: DevilMeters
        agentRemark: string
        revealedHiddenCosts?: DevilRevealedCost[]
      }>('/api/devil/negotiate', {
        method: 'POST',
        body: {
          sessionIdentifier: activeSession.value.sessionIdentifier,
          action,
          clauseIdentifier,
          amendmentText
        }
      })

      activeSession.value = {
        ...activeSession.value,
        contract: response.contract,
        actionRecords: response.actionRecords,
        meters: response.meters,
        revealedHiddenCosts: response.revealedHiddenCosts ?? activeSession.value.revealedHiddenCosts
      }
      persistSession()
    } catch (error) {
      errorMessage.value = 'The clerk did not accept that action. Please try again.'
      console.error('takeAction failed', error)
    } finally {
      isBusy.value = false
    }
  }

  async function conclude(decision: 'sign' | 'walk'): Promise<boolean> {
    if (activeSession.value === null) {
      return false
    }
    isBusy.value = true
    clearError()
    try {
      const response = await $fetch<{
        outcome: DevilOutcome
        noticeText: string
        meters: DevilMeters
        finalDocument: FinalDocument
      }>('/api/devil/conclude', {
        method: 'POST',
        body: { sessionIdentifier: activeSession.value.sessionIdentifier, decision }
      })

      notice.value = {
        outcome: response.outcome,
        noticeText: response.noticeText,
        meters: response.meters,
        finalDocument: response.finalDocument
      }
      persistNotice()
      return true
    } catch (error) {
      errorMessage.value = 'The filing could not be processed. Please try again.'
      console.error('conclude failed', error)
      return false
    } finally {
      isBusy.value = false
    }
  }

  return {
    activeSession,
    notice,
    isBusy,
    errorMessage,
    restoreSession,
    resetSession,
    startSession,
    takeAction,
    conclude
  }
}
