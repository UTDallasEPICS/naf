<template>
  <div>
    <h1>Login with Magic Link</h1>
    <form @submit.prevent="sendMagicLink">
      <input v-model="email" type="email" placeholder="Enter your email" required />
      <button type="submit" :disabled="loading">
        {{ loading ? 'Sending...' : 'Send Magic Link' }}
      </button>
    </form>
    <p v-if="message">{{ message }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { authClient } from '../auth.js';

const email = ref('');
const loading = ref(false);
const message = ref('');

const sendMagicLink = async () => {
  loading.value = true;
  message.value = '';
  try {
    const result = await authClient.signIn.magicLink({ email: email.value });
    message.value = 'Magic link sent! Check your email.';
  } catch (error) {
    message.value = 'Error sending magic link: ' + error.message;
  } finally {
    loading.value = false;
  }
};
</script>