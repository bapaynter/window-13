<script setup lang="ts">
import { selectWaitingStatusLine, formatElapsedDuration } from '~/utils/generationWaiting'

const { pendingGeneration, errorMessage, restoreSession, pollGenerationStatus, abandonPendingGeneration } =
  useDevilSession()

const ABANDON_AFTER_MILLISECONDS = 90000
const POLL_INTERVAL_MILLISECONDS = 1500

const elapsedMilliseconds = ref(0)
const hasFailed = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null
let tickTimer: ReturnType<typeof setInterval> | null = null

const statusLine = computed((): string => selectWaitingStatusLine(elapsedMilliseconds.value))
const elapsedLabel = computed((): string => formatElapsedDuration(elapsedMilliseconds.value))
const canAbandon = computed((): boolean => elapsedMilliseconds.value >= ABANDON_AFTER_MILLISECONDS)
const ticketNumber = computed((): string => {
  const identifier = pendingGeneration.value?.sessionIdentifier ?? ''
  return `A-${identifier.replace(/[^0-9a-f]/gi, '').slice(0, 3).toUpperCase() || '113'}`
})

function stopTimers(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  if (tickTimer !== null) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}

async function poll(): Promise<void> {
  const result = await pollGenerationStatus()
  if (result === 'ready') {
    stopTimers()
    await navigateTo('/contract')
    return
  }
  if (result === 'failed') {
    stopTimers()
    hasFailed.value = true
  }
}

async function abandon(): Promise<void> {
  stopTimers()
  abandonPendingGeneration()
  await navigateTo('/wish')
}

onMounted((): void => {
  restoreSession()
  if (pendingGeneration.value === null) {
    navigateTo('/wish')
    return
  }
  elapsedMilliseconds.value = Date.now() - pendingGeneration.value.startedAt
  tickTimer = setInterval((): void => {
    if (pendingGeneration.value !== null) {
      elapsedMilliseconds.value = Date.now() - pendingGeneration.value.startedAt
    }
  }, 1000)
  void poll()
  pollTimer = setInterval((): void => {
    void poll()
  }, POLL_INTERVAL_MILLISECONDS)
})

onBeforeUnmount(stopTimers)
</script>

<template>
  <div class="waiting-panel">
    <h2>Now Serving</h2>

    <div class="waiting-ticket">
      <span class="waiting-ticket-label">Your ticket</span>
      <span class="waiting-ticket-number">{{ ticketNumber }}</span>
    </div>

    <template v-if="!hasFailed">
      <div class="waiting-spinner" aria-hidden="true"></div>
      <p class="waiting-status" role="status" aria-live="polite">{{ statusLine }}</p>
      <p class="waiting-timer">You have been waiting {{ elapsedLabel }}.</p>

      <div class="panel" style="text-align: left">
        <div class="panel-title">Notice</div>
        <p class="small-print">
          An agent is being located for Window 13. Your instrument is being drawn up. Do not refresh. Do not close this
          window. If you do, your ticket remains valid and this page will resume where it left off.
        </p>
      </div>

      <div v-if="canAbandon" class="waiting-abandon">
        <p class="small-print">The wait is longer than usual.</p>
        <button class="gov-button" type="button" @click="abandon">Abandon Ticket and Return to Intake</button>
      </div>
    </template>

    <template v-else>
      <div class="error-banner">{{ errorMessage || 'The assigned window could not process your instrument.' }}</div>
      <p class="small-print">Your ticket has been voided. Please file again.</p>
      <button class="gov-button primary" type="button" @click="abandon">Return to Wish Intake</button>
    </template>
  </div>
</template>
