<script setup lang="ts">
import type { FinalDocument } from '~/composables/useDevilSession'

const properties = defineProps<{
  finalDocument: FinalDocument
}>()

const dispositionLabels: Record<string, string> = {
  approved: 'APPROVED',
  struck: 'STRUCK (LOAD-BEARING)',
  replaced: 'STRUCK / REISSUED',
  amended: 'AMENDED',
  untouched: 'UNTOUCHED'
}

function isKeystone(clauseIdentifier: number): boolean {
  return properties.finalDocument.keystoneClauseIdentifier === clauseIdentifier
}
</script>

<template>
  <div class="panel">
    <div class="panel-title">Attachment A — Contract of Record</div>

    <p class="small-print">
      Full disclosure of the instrument as executed, including every concealed term. This attachment is supplied
      after disposition, as required by § 666.7. It is not available before signature.
    </p>

    <div
      v-for="clause in properties.finalDocument.clauses"
      :key="clause.clauseIdentifier"
      class="clause-row"
      :class="{ 'is-amended': clause.disposition === 'amended', 'is-struck': clause.disposition === 'struck' || clause.disposition === 'replaced' }"
    >
      <div class="clause-heading">
        <span>
          Clause {{ clause.clauseIdentifier }} — {{ clause.category }}
          <strong v-if="isKeystone(clause.clauseIdentifier)"> ★ LOAD-BEARING</strong>
        </span>
        <span>{{ dispositionLabels[clause.disposition] ?? clause.disposition }}</span>
      </div>

      <p v-if="clause.originalText !== undefined" class="clause-text clause-original">
        Original wording: {{ clause.originalText }}
      </p>
      <p class="clause-text">{{ clause.text }}</p>

      <div class="clause-costs">
        <div>Stated consideration: {{ clause.obviousCost }}</div>
        <div>Processing fee on record: {{ clause.processingFee }}</div>
        <div class="balance-due">Concealed term: {{ clause.hiddenCost }}</div>
        <div v-if="clause.originalHiddenCost !== undefined" class="small-print">
          Original concealed term: {{ clause.originalHiddenCost }}
        </div>
      </div>
    </div>

    <h2>Record of Proceedings</h2>
    <table class="registry">
      <thead>
        <tr>
          <th>#</th>
          <th>Action</th>
          <th>Clause</th>
          <th>Fee applied</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in properties.finalDocument.actionLog" :key="entry.round">
          <td>{{ entry.round }}</td>
          <td>{{ entry.action }}</td>
          <td>{{ entry.clauseIdentifier }}</td>
          <td>{{ entry.feeApplied }}</td>
        </tr>
      </tbody>
    </table>

    <table class="meter-table" style="margin-top: 1rem">
      <tbody>
        <tr>
          <td>Processing Fee</td>
          <td class="amount">{{ properties.finalDocument.processingFee }}</td>
        </tr>
        <tr>
          <td>Administrative Surcharge</td>
          <td class="amount">{{ properties.finalDocument.administrativeSurcharge }}</td>
        </tr>
        <tr>
          <td><strong>Total Burden</strong></td>
          <td class="amount balance-due"><strong>{{ properties.finalDocument.burden }}</strong></td>
        </tr>
        <tr>
          <td>Trap Threshold</td>
          <td class="amount">{{ properties.finalDocument.trapThreshold }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
