<script setup lang="ts">
import type { FinalRecord } from '~/composables/useDevilSession'

interface FilingRecordResponse {
  wish: string
  noticeText: string
  finalRecord: FinalRecord
}

const route = useRoute()
const record = ref<FilingRecordResponse | null>(null)
const isLoading = ref(true)
const isMissing = ref(false)

const stampLabels: Record<string, string> = {
  cleanEscape: 'APPROVED',
  trapped: 'APPROVED',
  partial: 'APPROVED IN PART',
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

      <div class="notice-stamp" :class="`outcome-${record.finalRecord.outcome}`">
        {{ stampLabels[record.finalRecord.outcome] ?? record.finalRecord.outcome }}
      </div>

      <div v-if="record.noticeText.length > 0" class="panel">
        <div class="panel-title">Notice of Disposition</div>
        <p class="notice-text">{{ record.noticeText }}</p>
      </div>

      <ContractOfRecord :final-record="record.finalRecord" />

      <div class="button-row">
        <NuxtLink class="gov-button" to="/filings">Back to Filings</NuxtLink>
        <NuxtLink class="gov-button" to="/wish">File a Wish</NuxtLink>
      </div>
    </div>
  </div>
</template>
