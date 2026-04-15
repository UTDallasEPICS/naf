<template>
  <div class="page-container">
    <h1>Login with Magic Link</h1>
    <form @submit.prevent="sendMagicLink" class="login-form">
      <label>
        Email
        <input v-model="email" type="email" placeholder="Enter your email" required />
      </label>
      <button type="submit" :disabled="loading">
        {{ loading ? 'Sending...' : 'Send Magic Link' }}
      </button>
    </form>
    <p v-if="message" class="message">{{ message }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const email = ref('');
const loading = ref(false);
const message = ref('');

const { $auth } = useNuxtApp();

const sendMagicLink = async () => {
  loading.value = true;
  message.value = '';
  try {
    await $auth.signIn.magicLink({ email: email.value });
    message.value = 'Magic link sent! Check your email.';
  } catch (error) {
    message.value = 'Error sending magic link: ' + (error?.message ?? error);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.page-container {
  max-width: 440px;
  margin: 60px auto;
  padding: 24px;
  border: 1px solid #ddd;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(0,0,0,.08);
}
.login-form {
  display: grid;
  gap: 16px;
}
input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #bbb;
  border-radius: 8px;
}
button {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: #0070f3;
  color: white;
  cursor: pointer;
}
button:disabled {
  opacity: .6;
  cursor: not-allowed;
}
.message {
  margin-top: 12px;
  color: #333;
}
</style>
