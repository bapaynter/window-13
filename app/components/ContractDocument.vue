<script setup lang="ts">
import type {
  DevilActionRecord,
  DevilClause,
  DevilContract,
  DevilRevealedCost
} from '~/composables/useDevilSession'

const properties = defineProps<{
  contract: DevilContract
  actionRecords: DevilActionRecord[]
  revealedHiddenCosts: DevilRevealedCost[]
  isBusy: boolean
}>()

const emit = defineEmits<{
  (event: 'action', payload: { action: DevilActionRecord['action']; clauseIdentifier: number; amendmentText: string }): void
}>()

const amendingClauseIdentifier = ref<number | null>(null)
const amendmentDraft = ref('')

const statusLabels: Record<DevilActionRecord['action'], string> = {
  approve: 'APPROVED',
  strike: 'STRUCK',
  amend: 'AMENDED',
  invoke: 'REVIEWED'
}

function findClauseStatus(clause: DevilClause): DevilActionRecord['action'] | null {
  const matchingRecords = properties.actionRecords.filter(
    (record) => record.clauseIdentifier === clause.clauseIdentifier
  )
  const lastRecord = matchingRecords.at(-1)
  if (lastRecord === undefined) {
    return null
  }
  return lastRecord.action
}

function findRevealedHiddenCost(clause: DevilClause): string | null {
  const revealed = properties.revealedHiddenCosts.find(
    (entry) => entry.clauseIdentifier === clause.clauseIdentifier
  )
  return revealed?.hiddenCost ?? null
}

function clauseClass(clause: DevilClause): string {
  const status = findClauseStatus(clause)
  if (status === null) {
    return ''
  }
  return {
    approve: 'is-approved',
    strike: 'is-struck',
    amend: 'is-amended',
    invoke: ''
  }[status]
}

function beginAmendment(clause: DevilClause): void {
  amendingClauseIdentifier.value = clause.clauseIdentifier
  amendmentDraft.value = clause.text
}

function cancelAmendment(): void {
  amendingClauseIdentifier.value = null
  amendmentDraft.value = ''
}

function submitAmendment(clause: DevilClause): void {
  if (amendmentDraft.value.trim().length === 0) {
    return
  }
  emit('action', {
    action: 'amend',
    clauseIdentifier: clause.clauseIdentifier,
    amendmentText: amendmentDraft.value.trim()
  })
  cancelAmendment()
}

function requestAction(action: DevilActionRecord['action'], clause: DevilClause): void {
  emit('action', { action, clauseIdentifier: clause.clauseIdentifier, amendmentText: '' })
}
</script>

<template>
  <div class="contract-document">
    <div class="contract-preamble">{{ properties.contract.preamble }}</div>

    <div v-for="clause in properties.contract.clauses" :key="clause.clauseIdentifier" class="clause-row" :class="clauseClass(clause)">
      <div class="clause-heading">
        <span>Clause {{ clause.clauseIdentifier }} — {{ clause.category }}</span>
        <span v-if="findClauseStatus(clause) !== null">{{ statusLabels[findClauseStatus(clause) as DevilActionRecord['action']] }}</span>
      </div>

      <p class="clause-text">{{ clause.text }}</p>

      <div class="clause-costs">
        <div>Stated consideration: {{ clause.obviousCost }}</div>
        <div>Processing fee: {{ clause.processingFee }}</div>
        <div v-if="findRevealedHiddenCost(clause) !== null" class="balance-due">
          Disclosed concealed term: {{ findRevealedHiddenCost(clause) }}
        </div>
      </div>

      <div v-if="amendingClauseIdentifier === clause.clauseIdentifier" class="clause-actions">
        <textarea v-model="amendmentDraft" rows="3" :maxlength="400"></textarea>
        <div class="button-row">
          <button class="gov-button" type="button" :disabled="properties.isBusy" @click="submitAmendment(clause)">
            File Amendment
          </button>
          <button class="gov-button" type="button" @click="cancelAmendment">Cancel</button>
        </div>
      </div>

      <div v-else class="clause-actions">
        <button class="link-action" type="button" :disabled="properties.isBusy" @click="requestAction('approve', clause)">
          [APPROVE]
        </button>
        <button class="link-action" type="button" :disabled="properties.isBusy" @click="requestAction('strike', clause)">
          [STRIKE]
        </button>
        <button class="link-action" type="button" :disabled="properties.isBusy" @click="beginAmendment(clause)">
          [AMEND]
        </button>
        <button class="link-action" type="button" :disabled="properties.isBusy" @click="requestAction('invoke', clause)">
          [INVOKE — 1 CREDIT]
        </button>
      </div>
    </div>

    <p class="small-print">
      A struck clause that is not load-bearing is reissued immediately under revised terms. Repeat strikes and
      amendments are surcharged at an increasing rate.
    </p>
  </div>
</template>
