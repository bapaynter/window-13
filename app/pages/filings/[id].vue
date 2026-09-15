<script setup lang="ts">
import type { FinalDocument } from '~/composables/useDevilSession'

interface FilingRecordResponse {
  wish: string
  noticeText: string
  finalDocument: FinalDocument
}

const route = useRoute()
const record = ref<FilingRecordResponse | null>(null)
const isLoading = ref(true)
const isMissing = ref(false)

const stampLabels: Record<string, string> = {
  cleanEscape: 'APPROVED',
  trapped: 'APPROVED',
  literalHell: 'APPROVED — EXPEDITED',
  draw: 'WITHDRAWN'
}

onMounted(async (): Promise<void> => {
  try {
    const sessionIdentifier = String(route.params.id)
    record.value = await $fetch<FilingRecordResponse>(`/api/devil/filings/${sessionIdentifier}`)
  } catch (error) {
    console.error('filing load failed', error)
    isMissing.value = true
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div>
    <p v-if="isLoading">Retrieving record…</p>
    <p v-else-if="isMissing" class="small-print">No record on file for that filing.</p>

    <div v-else-if="record !== null">
      <h2>Filing Record</h2>
      <p class="small-print">Wish on record: “{{ record.wish }}”</p>

      <div class="notice-stamp" :class="`outcome-${record.finalDocument.outcome}`">
        {{ stampLabels[record.finalDocument.outcome] ?? record.finalDocument.outcome }}
      </div>

      <div v-if="record.noticeText.length > 0" class="panel">
        <div class="panel-title">Notice of Disposition</div>
        <p class="notice-text">{{ record.noticeText }}</p>
      </div>

      <ContractOfRecord :final-document="record.finalDocument" />

      <div class="button-row">
        <NuxtLink class="gov-button" to="/filings">Back to Filings</NuxtLink>
        <NuxtLink class="gov-button" to="/wish">File a Wish</NuxtLink>
      </div>
    </div>
  </div>
</template>
