<script setup lang="ts">
import type { AgentChatMessage } from '~/composables/useDevilSession'

const { activeSession, isBusy, errorMessage, restoreSession, takeAction, conclude } = useDevilSession()

const transcript = ref<AgentChatMessage[]>([])

onMounted((): void => {
  restoreSession()
  if (activeSession.value === null) {
    navigateTo('/wish')
    return
  }
  transcript.value = [{ speaker: 'clerk', text: activeSession.value.contract.agentRemark }]
})

async function handleAction(payload: {
  action: 'approve' | 'strike' | 'amend' | 'invoke'
  clauseIdentifier: number
  amendmentText: string
}): Promise<void> {
  const actionLabels: Record<typeof payload.action, string> = {
    approve: `I approve clause ${payload.clauseIdentifier}.`,
    strike: `I strike clause ${payload.clauseIdentifier}.`,
    amend: `I amend clause ${payload.clauseIdentifier}: ${payload.amendmentText}`,
    invoke: `I invoke my right of disclosure on clause ${payload.clauseIdentifier}.`
  }
  transcript.value.push({ speaker: 'applicant', text: actionLabels[payload.action] })

  const previousAgentRemark = activeSession.value?.contract.agentRemark ?? ''
  await takeAction(payload.action, payload.clauseIdentifier, payload.amendmentText)

  if (activeSession.value !== null && activeSession.value.contract.agentRemark !== previousAgentRemark) {
    transcript.value.push({ speaker: 'clerk', text: activeSession.value.contract.agentRemark })
  }
}

async function finalize(decision: 'sign' | 'walk'): Promise<void> {
  if (activeSession.value === null) {
    return
  }
  transcript.value.push({
    speaker: 'applicant',
    text: decision === 'sign' ? 'I will sign the contract.' : 'I am withdrawing. I will not sign.'
  })
  const didConclude = await conclude(decision)
  if (didConclude) {
    await navigateTo('/notice')
  }
}
</script>

<template>
  <div v-if="activeSession !== null">
    <h2>Form 666-D — Soul Contract</h2>

    <div v-if="errorMessage.length > 0" class="error-banner">{{ errorMessage }}</div>

    <p class="small-print">
      Applicant statement on file: “{{ activeSession.wish }}”
    </p>

    <ContractDocument
      :contract="activeSession.contract"
      :action-records="activeSession.actionRecords"
      :revealed-hidden-costs="activeSession.revealedHiddenCosts"
      :is-busy="isBusy"
      @action="handleAction"
    />

    <StatementOfAccount :meters="activeSession.meters" />

    <AgentChat :messages="transcript" />

    <div class="panel">
      <div class="panel-title">Disposition</div>
      <p>Sign the contract, or withdraw without penalty. Withdrawal is a neutral result.</p>
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
