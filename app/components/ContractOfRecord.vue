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
  substituted: 'SUBSTITUTED — STRIKE INEFFECTIVE'
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
      Full disclosure of the Instrument as executed, including which provisions were operative. Supplied after
      disposition, as required by § 666.7. Not available before signature.
    </p>

    <div
      v-for="provision in properties.finalRecord.provisions"
      :key="provision.provisionIdentifier"
      class="clause-row"
      :class="{
        'is-amended': provision.disposition === 'amended',
        'is-struck': provision.disposition === 'struck',
        'is-substituted': provision.disposition === 'substituted'
      }"
    >
      <div class="clause-heading">
        <span>
          <span class="section-number">§ {{ provision.sectionNumber }}</span>
          {{ provision.heading }}
        </span>
        <span>{{ dispositionLabels[provision.disposition] }}</span>
      </div>

      <div v-if="isControlling(provision.provisionIdentifier)" class="clause-costs">
        <strong>
          ★ OPERATIVE —
          {{ isNeutralized(provision.provisionIdentifier) ? 'NEUTRALIZED' : 'LEFT IN FORCE' }}
        </strong>
      </div>

      <p v-if="provision.originalText !== undefined" class="clause-text clause-original">
        Original wording: {{ provision.originalText }}
      </p>
      <p class="clause-text">{{ provision.text }}</p>
      <p v-if="provision.substitutedBy !== undefined" class="small-print">
        Reissued under §{{ provision.substitutedBy }}, which remains in effect.
      </p>

      <div class="clause-costs">Stated consideration: {{ provision.consideration }}</div>
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
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in properties.finalRecord.actionLog" :key="entry.round">
          <td>{{ entry.round }}</td>
          <td>{{ entry.action }}</td>
          <td>§ {{ entry.targetIdentifier }}</td>
        </tr>
      </tbody>
    </table>

    <table class="meter-table" style="margin-top: 1rem">
      <tbody>
        <tr>
          <td>Administrative Surcharges</td>
          <td class="amount">{{ properties.finalRecord.administrativeSurcharge }}</td>
        </tr>
        <tr>
          <td><strong>Total Assessment</strong></td>
          <td class="amount balance-due"><strong>{{ properties.finalRecord.assessment }}</strong></td>
        </tr>
        <tr>
          <td>Assessment Ceiling</td>
          <td class="amount">{{ properties.finalRecord.trapThreshold }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
