<script setup lang="ts">
import type { LaymanOutcome } from '~/composables/useDevilSession'

const properties = defineProps<{
  laymanOutcome: LaymanOutcome
}>()

const statusLabels: Record<LaymanOutcome['bypassStatus'], string> = {
  all: 'SET ASIDE IN FULL',
  partial: 'SET ASIDE IN PART',
  none: 'LEFT IN FORCE',
  draw: 'WITHDRAWN'
}
</script>

<template>
  <div class="panel layman-panel">
    <div class="panel-title">In Plain Terms</div>

    <div class="layman-row">
      <span class="layman-label">What the document did</span>
      <p>{{ properties.laymanOutcome.twistSummary }}</p>
    </div>

    <div class="layman-row">
      <span class="layman-label">What you did — {{ statusLabels[properties.laymanOutcome.bypassStatus] }}</span>
      <p>{{ properties.laymanOutcome.bypassDescription }}</p>
    </div>

    <div class="layman-row">
      <span class="layman-label">What your wish becomes</span>
      <p>{{ properties.laymanOutcome.effectOnWish }}</p>
    </div>
  </div>
</template>
