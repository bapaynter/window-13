<script setup lang="ts">
const properties = defineProps<{
  text: string
  knownIdentifiers: string[]
}>()

const emit = defineEmits<{
  (event: 'referenceClick', identifier: string): void
}>()

interface TextToken {
  kind: 'text' | 'reference'
  value: string
  identifier: string
}

const tokens = computed((): TextToken[] => {
  const pattern = /§\s?([0-9]+(?:\.[0-9]+)*)/g
  const result: TextToken[] = []
  let lastIndex = 0
  let match = pattern.exec(properties.text)
  while (match !== null) {
    if (match.index > lastIndex) {
      result.push({ kind: 'text', value: properties.text.slice(lastIndex, match.index), identifier: '' })
    }
    result.push({ kind: 'reference', value: match[0], identifier: match[1] ?? '' })
    lastIndex = match.index + match[0].length
    match = pattern.exec(properties.text)
  }
  if (lastIndex < properties.text.length) {
    result.push({ kind: 'text', value: properties.text.slice(lastIndex), identifier: '' })
  }
  return result
})

function isClickable(identifier: string): boolean {
  return properties.knownIdentifiers.includes(identifier)
}
</script>

<template>
  <span>
    <template v-for="(token, position) in tokens" :key="position">
      <button
        v-if="token.kind === 'reference' && isClickable(token.identifier)"
        class="reference-chip"
        type="button"
        @click="emit('referenceClick', token.identifier)"
      >
        {{ token.value }}
      </button>
      <span v-else>{{ token.value }}</span>
    </template>
  </span>
</template>
