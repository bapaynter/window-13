<script setup lang="ts">
import type { DevilMeters } from '~/composables/useDevilSession'

// Mirrors TRAP_THRESHOLD in server/utils/devil/meters.ts.
const TRAP_THRESHOLD = 60

const properties = defineProps<{
  meters: DevilMeters
}>()

const burdenStatus = computed((): { label: string; className: string } => {
  const burden = properties.meters.burden
  if (burden >= TRAP_THRESHOLD) {
    return { label: 'OVER THRESHOLD — SIGNATURE TRAPS', className: 'balance-due' }
  }
  if (burden >= TRAP_THRESHOLD - 15) {
    return { label: 'AT RISK', className: '' }
  }
  return { label: 'WITHIN LIMITS', className: '' }
})
</script>

<template>
  <div class="panel">
    <div class="panel-title">Statement of Account</div>
    <table class="meter-table">
      <tbody>
        <tr>
          <td>Processing Fee</td>
          <td class="amount">{{ properties.meters.processingFee }}</td>
        </tr>
        <tr>
          <td>Administrative Surcharge</td>
          <td class="amount">{{ properties.meters.administrativeSurcharge }}</td>
        </tr>
        <tr>
          <td><strong>Total Burden</strong></td>
          <td class="amount balance-due"><strong>{{ properties.meters.burden }}</strong></td>
        </tr>
        <tr>
          <td>Trap Threshold</td>
          <td class="amount">{{ TRAP_THRESHOLD }}</td>
        </tr>
        <tr>
          <td>Standing</td>
          <td class="amount" :class="burdenStatus.className">{{ burdenStatus.label }}</td>
        </tr>
        <tr>
          <td>Available Credits</td>
          <td class="amount">{{ properties.meters.availableCredits }}</td>
        </tr>
        <tr>
          <td>Keystone</td>
          <td class="amount">{{ properties.meters.isKeystoneStruck ? 'STRUCK' : 'ACTIVE' }}</td>
        </tr>
      </tbody>
    </table>
    <p class="small-print">
      Total burden combines the processing fee and every administrative surcharge. A struck clause that is not
      load-bearing is reissued at once; repeat edits are surcharged at an increasing rate. Balance is non-refundable.
    </p>
  </div>
</template>
