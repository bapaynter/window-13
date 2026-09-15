<script setup lang="ts">
interface FilingSummary {
  sessionIdentifier: string
  wish: string
  outcome: string
  createdAt: string
  processingFee: number
  burden: number
}

const filings = ref<FilingSummary[]>([])
const isLoading = ref(true)

const outcomeLabels: Record<string, string> = {
  cleanEscape: 'Approved (clean)',
  trapped: 'Approved (fee applied)',
  partial: 'Approved in part',
  literalHell: 'Approved (expedited)',
  draw: 'Withdrawn'
}

onMounted(async (): Promise<void> => {
  try {
    const response = await $fetch<{ filings: FilingSummary[] }>('/api/devil/filings')
    filings.value = response.filings
  } catch (error) {
    console.error('filings load failed', error)
  } finally {
    isLoading.value = false
  }
})

function formatDate(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleString()
}
</script>

<template>
  <div>
    <h2>Public Filings</h2>
    <div class="panel">
      <div class="panel-title">Records on File</div>
      <p v-if="isLoading">Retrieving records…</p>
      <p v-else-if="filings.length === 0" class="small-print">
        No filings on record. This office does not keep records of nothing. Probably.
      </p>
      <table v-else class="registry">
        <thead>
          <tr>
            <th>Date</th>
            <th>Wish</th>
            <th>Disposition</th>
            <th>Burden</th>
            <th>Record</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="filing in filings" :key="filing.sessionIdentifier">
            <td>{{ formatDate(filing.createdAt) }}</td>
            <td>{{ filing.wish }}</td>
            <td>{{ outcomeLabels[filing.outcome] ?? filing.outcome }}</td>
            <td>{{ filing.burden }}</td>
            <td>
              <NuxtLink :to="`/filings/${filing.sessionIdentifier}`">Open</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
