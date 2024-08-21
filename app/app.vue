<script setup>
import { ref, onMounted } from 'vue';
import { generateCodeVerifier, generateCodeChallenge } from './pkce';

const CLIENT_ID = '620c86ee3984d2790655b72a6470ed7a0e7073236e6e0165e85dee0df815458e';  // Client ID
const SCOPES = 'read_user api';
const GITLAB_HOST_URL = 'https://gitlab.k8s.cloud.statcan.ca/';

const authUrl = ref('');

onMounted(async () => {
  console.log('app.vue onMounted triggered');

  if (process.client) {
    // Dynamically set the REDIRECT_URI based on the environment
    let REDIRECT_URI;
    if (window.location.hostname === 'localhost') {
      REDIRECT_URI = 'http://localhost:3000/auth';  // Local environment
    } else {
      REDIRECT_URI = 'https://your-gitlab-pages-url/auth';  // GitLab Pages environment (Replace with your actual GitLab Pages URL)
    }

    console.log('REDIRECT_URI set to:', REDIRECT_URI);

    const codeVerifier = generateCodeVerifier();  // Generate codeVerifier
    console.log('Generated codeVerifier:', codeVerifier);

    localStorage.setItem('code_verifier', codeVerifier);  // Store codeVerifier in localStorage
    console.log('Stored codeVerifier:', localStorage.getItem('code_verifier'));

    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const encodedClientId = encodeURIComponent(CLIENT_ID);
    const encodedRedirectUri = encodeURIComponent(REDIRECT_URI);
    const encodedScopes = encodeURIComponent(SCOPES);
    const encodedCodeChallenge = encodeURIComponent(codeChallenge);
    const encodedCodeChallengeMethod = encodeURIComponent('S256');

    authUrl.value = `${GITLAB_HOST_URL}/oauth/authorize?client_id=${encodedClientId}&redirect_uri=${encodedRedirectUri}&response_type=code&state=STATE&scope=${encodedScopes}&code_challenge=${encodedCodeChallenge}&code_challenge_method=${encodedCodeChallengeMethod}`;
    console.log('Auth URL generated:', authUrl.value);
  }
});
</script>

<template>
  <div>
    <u-container>
      <u-card class="mt-10">
        <template #header>
          <div class="flex justify-between">
            <h1>Welcome to Nuxt UAuth App</h1>
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
