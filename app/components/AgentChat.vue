<script setup lang="ts">
import type { AgentChatMessage } from '~/composables/useDevilSession'

const properties = defineProps<{
  messages: AgentChatMessage[]
}>()

const transcriptElement = ref<HTMLElement | null>(null)

watch(
  () => properties.messages.length,
  async (): Promise<void> => {
    await nextTick()
    if (transcriptElement.value !== null) {
      transcriptElement.value.scrollTop = transcriptElement.value.scrollHeight
    }
  }
)
</script>

<template>
  <div class="panel">
    <div class="panel-title">Live Agent — Window 13</div>
    <div ref="transcriptElement" class="agent-chat">
      <div
        v-for="(message, position) in properties.messages"
        :key="position"
        class="agent-message"
        :class="message.speaker === 'applicant' ? 'applicant' : 'clerk'"
      >
        <span class="speaker">{{ message.speaker === 'applicant' ? 'Applicant' : 'Clerk' }}</span>
        <span class="bubble">{{ message.text }}</span>
      </div>
    </div>
    <p class="small-print">An agent is reading the record. Do not close this window.</p>
  </div>
</template>
