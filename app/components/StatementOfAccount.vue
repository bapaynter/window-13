<script setup lang="ts">
import type { DevilMeters } from '~/composables/useDevilSession'

// Mirrors TRAP_THRESHOLD in server/utils/devil/meters.ts.
const TRAP_THRESHOLD = 20

const properties = defineProps<{
  meters: DevilMeters
}>()

const burdenStatus = computed((): { label: string; className: string } => {
  const assessment = properties.meters.assessment
  if (assessment >= TRAP_THRESHOLD) {
    return { label: 'OVER THE CEILING — SIGNATURE TRAPS', className: 'balance-due' }
  }
  return { label: 'WITHIN THE CEILING', className: '' }
})
</script>

<template>
  <div class="panel">
    <div class="panel-title">Statement of Account</div>
    <table class="meter-table">
      <tbody>
        <tr>
          <td>Administrative Surcharges</td>
          <td class="amount">{{ properties.meters.administrativeSurcharge }}</td>
        </tr>
        <tr>
          <td><strong>Total Assessment</strong></td>
          <td class="amount balance-due"><strong>{{ properties.meters.assessment }}</strong></td>
        </tr>
        <tr>
          <td>Assessment Ceiling</td>
          <td class="amount">{{ TRAP_THRESHOLD }}</td>
        </tr>
        <tr>
          <td>Standing</td>
          <td class="amount" :class="burdenStatus.className">{{ burdenStatus.label }}</td>
        </tr>
      </tbody>
    </table>
    <p class="small-print">
      Approval is free. Each strike or amendment carries a fixed administrative surcharge. A struck provision that an
      active substitution provision covers is reissued. The assessment is non-refundable.
    </p>
  </div>
</template>
