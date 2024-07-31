<script setup>
import { computed } from 'vue';

// https:// gitlab.example.com/oauth/authorize?client_id=APP_ID&redirect_uri=REDIRECT_URI&response_type=code&state=STATE&scope=REQUESTED_SCOPES&code_challenge=CODE_CHALLENGE&code_challenge_method=S256

const GITLAB_HOST_URL = 'https://gitlab.k8s.cloud.statcan.ca/';
const CLIENT_ID = '527851127ac7d235263d0e622367161a5ee700db0b5460c98fd9ccaa03e392b5';
const REDIRECT_URI = 'http://localhost:3000/auth/';
const SCOPES = 'REQUESTED_SCOPES';
const CODE_CHALLENGE = 'CODE_CHALLENGE';
const CODE_CHALLENGE_METHOD = 'S256';

const authUrl = computed(() => {
  const encodedClientId = encodeURIComponent(CLIENT_ID);
  const encodedRedirectUri = encodeURIComponent(REDIRECT_URI);
  const encodedScopes = encodeURIComponent(SCOPES);
  const encodedCodeChallenge = encodeURIComponent(CODE_CHALLENGE);
  const encodedCodeChallengeMethod = encodeURIComponent(CODE_CHALLENGE_METHOD);

  return `${GITLAB_HOST_URL}/oauth/authorize?client_id=${encodedClientId}&redirect_uri=${encodedRedirectUri}&response_type=code&state=STATE&scope=${encodedScopes}&code_challenge=${encodedCodeChallenge}&code_challenge_method=${encodedCodeChallengeMethod}`;
});
</script>

<template>
  <div>
    <u-container>
      <u-card class="mt-10">
        <template #header>
          <div class="flex justify-between">
            <h1>Welcome to Nuxt UI Starter</h1>
            <color-scheme>
              <u-select
                v-model="$colorMode.preference"
                :options="['system', 'light', 'dark']"
              />
            </color-scheme>
          </div>
        </template>
        <div class="flex justify-between">
          <u-button
            icon="i-heroicons-book-open"
            to="https://ui.nuxt.com"
            target="_blank"
          >
            Open Nuxt UI Documentation
          </u-button>

          <u-button
            icon="i-heroicons-book-open"
            :to="authUrl"
            target="_blank"
          >
            Login with Gitlab
          </u-button>
        </div>
      </u-card>
    </u-container>
  </div>
</template>
