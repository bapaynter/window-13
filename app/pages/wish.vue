<script setup lang="ts">
const { startSession, isBusy, errorMessage, resetSession } = useDevilSession()

const wish = ref('')
const hasAcknowledged = ref(false)
const MAXIMUM_WISH_LENGTH = 500

const isSubmittable = computed(
  (): boolean => wish.value.trim().length > 0 && hasAcknowledged.value && !isBusy.value
)

onMounted((): void => {
  resetSession()
})

async function submitWish(): Promise<void> {
  if (!isSubmittable.value) {
    return
  }
  const didStart = await startSession(wish.value.trim())
  if (didStart) {
    await navigateTo('/contract')
  }
}
</script>

<template>
  <div>
    <h2>Form 666-A — Wish Intake</h2>

    <div v-if="errorMessage.length > 0" class="error-banner">{{ errorMessage }}</div>

    <div class="panel">
      <div class="panel-title">Field 1 — Statement of Wish</div>
      <label class="field-label" for="wish-field">
        State your wish in a single sentence. <span class="required-mark">*</span>
      </label>
      <textarea
        id="wish-field"
        v-model="wish"
        rows="4"
        :maxlength="MAXIMUM_WISH_LENGTH"
        placeholder="I wish for..."
      ></textarea>
      <div class="hint-text">{{ wish.length }} / {{ MAXIMUM_WISH_LENGTH }} characters</div>

      <label class="field-label" style="margin-top: 0.75rem">
        <input v-model="hasAcknowledged" type="checkbox" />
        I understand the wish is final once signed. <span class="required-mark">*</span>
      </label>

      <div class="button-row">
        <button class="gov-button primary" type="button" :disabled="!isSubmittable" @click="submitWish">
          {{ isBusy ? 'Processing…' : 'Submit for Processing' }}
        </button>
      </div>
      <p class="small-print">
        Submissions may take a moment while the assigned window reviews your record. Do not refresh. Do not blink.
      </p>
    </div>
  </div>
</template>
