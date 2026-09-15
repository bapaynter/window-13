<script setup lang="ts">
const message = ref('')
const hasSubmitted = ref(false)

function submitMessage(): void {
  if (message.value.trim().length === 0) {
    return
  }
  hasSubmitted.value = true
}
</script>

<template>
  <div>
    <h2>Contact This Office</h2>
    <div class="panel">
      <div class="panel-title">Form 666-C — Correspondence</div>
      <p class="small-print">
        Response times are currently estimated at one to six eternities. Correspondence is read in the order received.
        Correspondence is not read.
      </p>
      <label class="field-label" for="contact-field">Your message <span class="required-mark">*</span></label>
      <textarea id="contact-field" v-model="message" rows="4" maxlength="400"></textarea>
      <div class="button-row">
        <button class="gov-button primary" type="button" @click="submitMessage">Send</button>
      </div>

      <div v-if="hasSubmitted" class="panel" style="margin-top: 1rem">
        <div class="panel-title">Automatic Reply</div>
        <p>
          Thank you for your correspondence. Your message has been received, logged, and will be considered at a time
          that suits the Department. It will not be considered at a time that suits you. Please do not follow up. Please
          do not send a second message. Please do not send a third message. The fourth message is admissible.
        </p>
      </div>
    </div>
  </div>
</template>
