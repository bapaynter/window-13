export type ProvisionMechanism =
  | 'delivery'
  | 'consideration'
  | 'waiver'
  | 'term'
  | 'precedence'
  | 'severability'
  | 'incorporation'
  | 'definition'
  | 'survivorship'
  | 'ambiguity'

export interface PlayerDefinition {
  definitionIdentifier: string
  term: string
  text: string
  references: string[]
}

export interface PlayerProvision {
  provisionIdentifier: string
  sectionNumber: string
  heading: string
  text: string
  references: string[]
  consideration: string
  processingFee: number
  mechanism: ProvisionMechanism
}

export interface PlayerSchedule {
  scheduleIdentifier: string
  title: string
  body: string
  referencedBy: string[]
}

export interface PlayerInstrument {
  recitals: string
  definitions: PlayerDefinition[]
  provisions: PlayerProvision[]
  schedules: PlayerSchedule[]
}

export interface DevilMeters {
  processingFee: number
  administrativeSurcharge: number
  burden: number
}

export interface DevilActionRecord {
  round: number
  action: 'approve' | 'strike' | 'amend'
  targetIdentifier: string
  processingFee: number
  amendmentText?: string
}

export type ProvisionState = 'untouched' | 'approved' | 'struck' | 'amended' | 'substituted'

export interface DevilSimulation {
  provisionStates: Record<string, ProvisionState>
  activeSeverabilityIdentifiers: string[]
  substitutedProvisionIdentifiers: string[]
  danglingReferenceIdentifiers: string[]
}

export type DevilOutcome = 'cleanEscape' | 'trapped' | 'partial' | 'literalHell' | 'draw'

export interface FinalProvisionDisposition {
  provisionIdentifier: string
  sectionNumber: string
  heading: string
  text: string
  consideration: string
  processingFee: number
  mechanism: ProvisionMechanism
  references: string[]
  disposition: ProvisionState
  isControlling: boolean
  neutralizationMethod: 'strike' | 'amend' | null
  originalText?: string
}

export interface FinalActionLogEntry {
  round: number
  action: 'approve' | 'strike' | 'amend'
  targetIdentifier: string
  feeApplied: number
  amendmentText?: string
}

export interface FinalRecord {
  outcome: DevilOutcome
  recitals: string
  definitions: PlayerDefinition[]
  provisions: FinalProvisionDisposition[]
  schedules: PlayerSchedule[]
  controllingProvisionIdentifiers: string[]
  neutralizedControlIdentifiers: string[]
  danglingReferenceIdentifiers: string[]
  actionLog: FinalActionLogEntry[]
  processingFee: number
  administrativeSurcharge: number
  burden: number
  trapThreshold: number
  trapSummary: string
}

export interface ActiveDevilSession {
  sessionIdentifier: string
  wish: string
  instrument: PlayerInstrument
  actionRecords: DevilActionRecord[]
  meters: DevilMeters
  simulation: DevilSimulation
}

export interface DevilNotice {
  outcome: DevilOutcome
  noticeText: string
  meters: DevilMeters
  finalRecord: FinalRecord
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

  function resetSession(): void {
    activeSession.value = null
    notice.value = null
    errorMessage.value = ''
    persistSession()
    persistNotice()
  }

  async function startSession(wish: string): Promise<boolean> {
    isBusy.value = true
    errorMessage.value = ''
    try {
      const response = await $fetch<{
        sessionIdentifier: string
        instrument: PlayerInstrument
        meters: DevilMeters
      }>('/api/devil/issue', { method: 'POST', body: { wish } })

      activeSession.value = {
        sessionIdentifier: response.sessionIdentifier,
        wish,
        instrument: response.instrument,
        actionRecords: [],
        meters: response.meters,
        simulation: {
          provisionStates: {},
          activeSeverabilityIdentifiers: [],
          substitutedProvisionIdentifiers: [],
          danglingReferenceIdentifiers: []
        }
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
    targetIdentifier: string,
    amendmentText = ''
  ): Promise<string> {
    if (activeSession.value === null) {
      return ''
    }
    isBusy.value = true
    errorMessage.value = ''
    try {
      const response = await $fetch<{
        actionRecords: DevilActionRecord[]
        meters: DevilMeters
        agentRemark: string
        simulation: DevilSimulation
      }>('/api/devil/negotiate', {
        method: 'POST',
        body: {
          sessionIdentifier: activeSession.value.sessionIdentifier,
          action,
          targetIdentifier,
          amendmentText
        }
      })

      activeSession.value = {
        ...activeSession.value,
        actionRecords: response.actionRecords,
        meters: response.meters,
        simulation: response.simulation
      }
      persistSession()
      return response.agentRemark
    } catch (error) {
      errorMessage.value = 'The clerk did not accept that action. Please try again.'
      console.error('takeAction failed', error)
      return ''
    } finally {
      isBusy.value = false
    }
  }

  async function conclude(decision: 'sign' | 'walk'): Promise<boolean> {
    if (activeSession.value === null) {
      return false
    }
    isBusy.value = true
    errorMessage.value = ''
    try {
      const response = await $fetch<{
        outcome: DevilOutcome
        noticeText: string
        meters: DevilMeters
        finalRecord: FinalRecord
      }>('/api/devil/conclude', {
        method: 'POST',
        body: { sessionIdentifier: activeSession.value.sessionIdentifier, decision }
      })

      notice.value = {
        outcome: response.outcome,
        noticeText: response.noticeText,
        meters: response.meters,
        finalRecord: response.finalRecord
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
