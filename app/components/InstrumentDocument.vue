<script setup lang="ts">
import type { DevilActionRecord, DevilSimulation, PlayerInstrument } from '~/composables/useDevilSession'

const properties = defineProps<{
  instrument: PlayerInstrument
  actionRecords: DevilActionRecord[]
  simulation: DevilSimulation
  isBusy: boolean
  highlightedIdentifier: string | null
}>()

const emit = defineEmits<{
  (
    event: 'action',
    payload: { action: DevilActionRecord['action']; targetIdentifier: string; amendmentText: string }
  ): void
  (event: 'referenceClick', identifier: string): void
}>()

const amendingIdentifier = ref<string | null>(null)
const amendmentDraft = ref('')

const knownIdentifiers = computed((): string[] => [
  ...properties.instrument.definitions.map((definition) => definition.definitionIdentifier),
  ...properties.instrument.provisions.map((provision) => provision.provisionIdentifier),
  ...properties.instrument.schedules.map((schedule) => schedule.scheduleIdentifier)
])

const statusLabels: Record<DevilActionRecord['action'], string> = {
  approve: 'APPROVED',
  strike: 'STRUCK',
  amend: 'AMENDED'
}

const sectionGroups = computed((): { major: string; provisions: PlayerInstrument['provisions'] }[] => {
  const groups = new Map<string, PlayerInstrument['provisions']>()
  for (const provision of properties.instrument.provisions) {
    const major = provision.sectionNumber.split('.')[0] ?? '0'
    const existing = groups.get(major) ?? []
    existing.push(provision)
    groups.set(major, existing)
  }
  return [...groups.entries()].map(([major, provisions]) => ({ major, provisions }))
})

function provisionState(identifier: string) {
  return properties.simulation.provisionStates[identifier] ?? 'untouched'
}

function provisionClass(identifier: string): string {
  return {
    untouched: '',
    approved: 'is-approved',
    struck: 'is-struck',
    amended: 'is-amended',
    substituted: 'is-substituted'
  }[provisionState(identifier)] ?? ''
}

function statusLabelFor(identifier: string): string {
  const state = provisionState(identifier)
  if (state === 'substituted') {
    return 'SUBSTITUTED'
  }
  const matchingRecords = properties.actionRecords.filter(
    (record) => record.targetIdentifier === identifier
  )
  const lastRecord = matchingRecords.at(-1)
  if (lastRecord === undefined) {
    return state.toUpperCase()
  }
  return statusLabels[lastRecord.action]
}

function backlinksFor(identifier: string): string[] {
  const backlinks: string[] = []
  for (const provision of properties.instrument.provisions) {
    if (provision.references.includes(identifier)) {
      backlinks.push(provision.provisionIdentifier)
    }
  }
  for (const schedule of properties.instrument.schedules) {
    if (schedule.referencedBy.includes(identifier)) {
      backlinks.push(`Schedule ${schedule.scheduleIdentifier}`)
    }
  }
  return backlinks
}

function amendmentTextFor(identifier: string, fallback: string): string {
  const amendments = properties.actionRecords.filter(
    (record) => record.action === 'amend' && record.targetIdentifier === identifier
  )
  return amendments.at(-1)?.amendmentText ?? fallback
}

function beginAmendment(identifier: string, currentText: string): void {
  amendingIdentifier.value = identifier
  amendmentDraft.value = currentText
}

function cancelAmendment(): void {
  amendingIdentifier.value = null
  amendmentDraft.value = ''
}

function submitAmendment(identifier: string): void {
  if (amendmentDraft.value.trim().length === 0) {
    return
  }
  emit('action', {
    action: 'amend',
    targetIdentifier: identifier,
    amendmentText: amendmentDraft.value.trim()
  })
  cancelAmendment()
}

function requestAction(action: DevilActionRecord['action'], identifier: string): void {
  emit('action', { action, targetIdentifier: identifier, amendmentText: '' })
}
</script>

<template>
  <div class="instrument">
    <div class="instrument-recitals">
      <div class="panel-title">Recitals</div>
      <p class="clause-text">
        <CrossReferencedText
          :text="properties.instrument.recitals"
          :known-identifiers="knownIdentifiers"
          @reference-click="emit('referenceClick', $event)"
        />
      </p>
    </div>

    <div class="instrument-section">
      <h3>Article 1 — Definitions</h3>
      <div
        v-for="definition in properties.instrument.definitions"
        :key="definition.definitionIdentifier"
        class="definition-row"
      >
        <span class="section-number">§ {{ definition.definitionIdentifier }}</span>
        <span class="definition-term">“{{ definition.term }}”</span>
        <CrossReferencedText
          :text="definition.text"
          :known-identifiers="knownIdentifiers"
          @reference-click="emit('referenceClick', $event)"
        />
      </div>
    </div>

    <div v-for="group in sectionGroups" :key="group.major" class="instrument-section">
      <h3>Article {{ group.major }}</h3>
      <div
        v-for="provision in group.provisions"
        :id="`provision-${provision.provisionIdentifier}`"
        :key="provision.provisionIdentifier"
        class="clause-row"
        :class="[
          provisionClass(provision.provisionIdentifier),
          { 'is-highlighted': properties.highlightedIdentifier === provision.provisionIdentifier }
        ]"
      >
        <div class="clause-heading">
          <span>
            <span class="section-number">§ {{ provision.sectionNumber }}</span>
            {{ provision.heading }}
          </span>
          <span v-if="provisionState(provision.provisionIdentifier) !== 'untouched'">
            {{ statusLabelFor(provision.provisionIdentifier) }}
          </span>
        </div>

        <p class="clause-text">
          <CrossReferencedText
            :text="amendmentTextFor(provision.provisionIdentifier, provision.text)"
            :known-identifiers="knownIdentifiers"
            @reference-click="emit('referenceClick', $event)"
          />
        </p>

        <div class="clause-costs">
          <div>Stated consideration: {{ provision.consideration }}</div>
          <div>Processing fee: {{ provision.processingFee }}</div>
          <div v-if="backlinksFor(provision.provisionIdentifier).length > 0">
            Referenced by: {{ backlinksFor(provision.provisionIdentifier).join(', ') }}
          </div>
        </div>

        <div v-if="amendingIdentifier === provision.provisionIdentifier" class="clause-actions">
          <textarea v-model="amendmentDraft" rows="3" :maxlength="400"></textarea>
          <div class="button-row">
            <button
              class="gov-button"
              type="button"
              :disabled="properties.isBusy"
              @click="submitAmendment(provision.provisionIdentifier)"
            >
              File Amendment
            </button>
            <button class="gov-button" type="button" @click="cancelAmendment">Cancel</button>
          </div>
        </div>
        <div v-else class="clause-actions">
          <button
            class="link-action"
            type="button"
            :disabled="properties.isBusy"
            @click="requestAction('approve', provision.provisionIdentifier)"
          >
            [APPROVE]
          </button>
          <button
            class="link-action"
            type="button"
            :disabled="properties.isBusy"
            @click="requestAction('strike', provision.provisionIdentifier)"
          >
            [STRIKE]
          </button>
          <button
            class="link-action"
            type="button"
            :disabled="properties.isBusy"
            @click="beginAmendment(provision.provisionIdentifier, provision.text)"
          >
            [AMEND]
          </button>
        </div>
      </div>
    </div>

    <div v-if="properties.instrument.schedules.length > 0" class="instrument-section">
      <h3>Schedules</h3>
      <div v-for="schedule in properties.instrument.schedules" :key="schedule.scheduleIdentifier" class="clause-row">
        <div class="clause-heading">
          <span>
            <span class="section-number">Schedule {{ schedule.scheduleIdentifier }}</span>
            {{ schedule.title }}
          </span>
        </div>
        <p class="clause-text">
          <CrossReferencedText
            :text="schedule.body"
            :known-identifiers="knownIdentifiers"
            @reference-click="emit('referenceClick', $event)"
          />
        </p>
        <div class="clause-costs">
          A schedule cannot be struck. Strike the provision that incorporates it.
        </div>
      </div>
    </div>
  </div>
</template>
