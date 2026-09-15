<script setup lang="ts">
const { notice, activeSession, restoreSession, resetSession } = useDevilSession()

const stampLabels: Record<string, string> = {
  cleanEscape: 'APPROVED',
  trapped: 'APPROVED',
  partial: 'APPROVED IN PART',
  literalHell: 'APPROVED — EXPEDITED',
  draw: 'WITHDRAWN'
}

onMounted((): void => {
  restoreSession()
  if (notice.value === null) {
    navigateTo(activeSession.value === null ? '/wish' : '/contract')
  }
})

async function fileAnother(): Promise<void> {
  resetSession()
  await navigateTo('/wish')
}
</script>

<template>
  <div v-if="notice !== null">
    <h2>Official Notice of Disposition</h2>

    <div class="notice-stamp" :class="`outcome-${notice.outcome}`">
      {{ stampLabels[notice.outcome] }}
    </div>

    <div class="panel">
      <div class="panel-title">Case Summary</div>
      <p class="notice-text">{{ notice.noticeText }}</p>
    </div>

    <LaymanSummary :layman-outcome="notice.finalRecord.laymanOutcome" />

    <StatementOfAccount :meters="notice.meters" />

    <ContractOfRecord :final-record="notice.finalRecord" />

    <div class="button-row">
      <button class="gov-button" type="button" @click="fileAnother">File Another Wish</button>
      <NuxtLink class="gov-button" to="/filings">View Filings</NuxtLink>
    </div>
  </div>
</template>
