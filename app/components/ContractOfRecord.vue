<script setup lang="ts">
import type { FinalRecord, ProvisionState } from '~/composables/useDevilSession'

const properties = defineProps<{
  finalRecord: FinalRecord
}>()

const dispositionLabels: Record<ProvisionState, string> = {
  untouched: 'UNTOUCHED',
  approved: 'APPROVED',
  struck: 'STRUCK',
  amended: 'AMENDED',
  substituted: 'SUBSTITUTED BY SEVERABILITY'
}

function isControlling(identifier: string): boolean {
  return properties.finalRecord.controllingProvisionIdentifiers.includes(identifier)
}

function isNeutralized(identifier: string): boolean {
  return properties.finalRecord.neutralizedControlIdentifiers.includes(identifier)
}
</script>

<template>
  <div class="panel">
    <div class="panel-title">Attachment A — Contract of Record</div>

    <p class="small-print">
      Full disclosure of the instrument as executed, including which provisions controlled the outcome. Supplied after
      disposition, as required by § 666.7. Not available before signature.
    </p>

    <div
      v-for="provision in properties.finalRecord.provisions"
      :key="provision.provisionIdentifier"
      class="clause-row"
      :class="{
        'is-amended': provision.disposition === 'amended',
        'is-struck': provision.disposition === 'struck' || provision.disposition === 'substituted'
      }"
    >
      <div class="clause-heading">
        <span>
          <span class="section-number">§ {{ provision.sectionNumber }}</span>
          {{ provision.heading }}
          <strong v-if="isControlling(provision.provisionIdentifier)">
            ★ CONTROLLING —
            {{ isNeutralized(provision.provisionIdentifier) ? 'NEUTRALIZED' : 'LEFT STANDING' }}
            ({{ provision.neutralizationMethod ?? 'strike' }})</strong
          >
        </span>
        <span>{{ dispositionLabels[provision.disposition] }}</span>
      </div>

      <p v-if="provision.originalText !== undefined" class="clause-text clause-original">
        Original wording: {{ provision.originalText }}
      </p>
      <p class="clause-text">{{ provision.text }}</p>

      <div class="clause-costs">
        <div>Stated consideration: {{ provision.consideration }}</div>
        <div>Processing fee on record: {{ provision.processingFee }}</div>
      </div>
    </div>

    <div v-if="properties.finalRecord.danglingReferenceIdentifiers.length > 0" class="clause-costs">
      Dangling references after removal:
      {{ properties.finalRecord.danglingReferenceIdentifiers.join(', ') }}
    </div>

    <h2>Record of Proceedings</h2>
    <table class="registry">
      <thead>
        <tr>
          <th>#</th>
          <th>Action</th>
          <th>Provision</th>
          <th>Fee applied</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in properties.finalRecord.actionLog" :key="entry.round">
          <td>{{ entry.round }}</td>
          <td>{{ entry.action }}</td>
          <td>§ {{ entry.targetIdentifier }}</td>
          <td>{{ entry.feeApplied }}</td>
        </tr>
      </tbody>
    </table>

    <table class="meter-table" style="margin-top: 1rem">
      <tbody>
        <tr>
          <td>Processing Fee</td>
          <td class="amount">{{ properties.finalRecord.processingFee }}</td>
        </tr>
        <tr>
          <td>Administrative Surcharge</td>
          <td class="amount">{{ properties.finalRecord.administrativeSurcharge }}</td>
        </tr>
        <tr>
          <td><strong>Total Burden</strong></td>
          <td class="amount balance-due"><strong>{{ properties.finalRecord.burden }}</strong></td>
        </tr>
        <tr>
          <td>Trap Threshold</td>
          <td class="amount">{{ properties.finalRecord.trapThreshold }}</td>
        </tr>
      </tbody>
    </table>

    <div class="panel" style="margin-top: 1rem">
      <div class="panel-title">Examining Clerk’s Note</div>
      <p class="small-print">{{ properties.finalRecord.trapSummary }}</p>
    </div>
  </div>
</template>
