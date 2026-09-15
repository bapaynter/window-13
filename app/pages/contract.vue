<script setup lang="ts">
import type { AgentChatMessage, DevilActionRecord } from '~/composables/useDevilSession'

const { activeSession, isBusy, errorMessage, restoreSession, takeAction, conclude } = useDevilSession()

const transcript = ref<AgentChatMessage[]>([])
const highlightedIdentifier = ref<string | null>(null)

onMounted((): void => {
  restoreSession()
  if (activeSession.value === null) {
    navigateTo('/wish')
  }
})

async function handleAction(payload: {
  action: DevilActionRecord['action']
  targetIdentifier: string
  amendmentText: string
}): Promise<void> {
  const actionLabels: Record<DevilActionRecord['action'], string> = {
    approve: `I approve §${payload.targetIdentifier}.`,
    strike: `I strike §${payload.targetIdentifier}.`,
    amend: `I amend §${payload.targetIdentifier}: ${payload.amendmentText}`
  }
  transcript.value.push({ speaker: 'applicant', text: actionLabels[payload.action] })

  const agentRemark = await takeAction(payload.action, payload.targetIdentifier, payload.amendmentText)
  if (agentRemark.length > 0) {
    transcript.value.push({ speaker: 'clerk', text: agentRemark })
  }
}

async function handleReferenceClick(identifier: string): Promise<void> {
  highlightedIdentifier.value = identifier
  await nextTick()
  const element = document.getElementById(`provision-${identifier}`)
  if (element !== null) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

async function finalize(decision: 'sign' | 'walk'): Promise<void> {
  if (activeSession.value === null) {
    return
  }
  const didConclude = await conclude(decision)
  if (didConclude) {
    await navigateTo('/notice')
  }
}
</script>

<template>
  <div v-if="activeSession !== null">
    <h2>Form 666-D — Instrument Under Review</h2>

    <div v-if="errorMessage.length > 0" class="error-banner">{{ errorMessage }}</div>

    <div class="panel objective-panel">
      <div class="panel-title">Objective</div>
      <p>
        Your wish: “{{ activeSession.wish }}”
      </p>
      <p>
        Read the instrument carefully. Neutralize every provision that controls how the wish is performed, then sign
        within the trap threshold (60). Struck provisions that severability covers are substituted, not removed. Cross
        references (§) are clickable.
      </p>
    </div>

    <InstrumentDocument
      :instrument="activeSession.instrument"
      :action-records="activeSession.actionRecords"
      :simulation="activeSession.simulation"
      :is-busy="isBusy"
      :highlighted-identifier="highlightedIdentifier"
      @action="handleAction"
      @reference-click="handleReferenceClick"
    />

    <StatementOfAccount :meters="activeSession.meters" />

    <AgentChat :messages="transcript" />

    <div class="panel">
      <div class="panel-title">Disposition</div>
      <p>Sign the instrument, or withdraw without penalty. Withdrawal is a neutral result.</p>
      <div class="button-row">
        <button class="gov-button primary" type="button" :disabled="isBusy" @click="finalize('sign')">
          Sign and Submit
        </button>
        <button class="gov-button" type="button" :disabled="isBusy" @click="finalize('walk')">
          Withdraw
        </button>
      </div>
    </div>
  </div>
</template>
