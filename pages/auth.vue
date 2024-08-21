<script setup>
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const router = useRouter();
let codeVerifier = '';

if (process.client) {
  codeVerifier = localStorage.getItem('code_verifier');  // Use localStorage
}
const CLIENT_ID = '620c86ee3984d2790655b72a6470ed7a0e7073236e6e0165e85dee0df815458e';  // Client ID
const CLIENT_SECRET = 'gloas-12450902bc72319cabe4b6ced5bacf5db6fdd7ea692e8adc536c78c6401effe0';  // Client Secret
const REDIRECT_URI = 'http://localhost:3000/auth';

const GITLAB_HOST_URL = 'https://gitlab.k8s.cloud.statcan.ca/';

const code = route.query.code;

console.log('Auth page loaded');
console.log('Route object:', route);
console.log('Query params:', route.query);

async function exchangeCodeForToken() {
  if (!code) {
    console.error('No authorization code found in query parameters.');
    router.push('/');
    return;
  }

  if (!codeVerifier) {
    console.error('No code verifier found in storage.');
    router.push('/');
    return;
  }

  try {
    console.log('Exchanging code for token...');
    
    const response = await axios.post(`${GITLAB_HOST_URL}/oauth/token`, {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,  
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    });

    const accessToken = response.data.access_token;
    console.log('Access token received:', accessToken);

    if (process.client) {
      localStorage.setItem('access_token', accessToken);  
    }
    router.push('/repositories');
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    console.error('Error details:', error.response ? error.response.data : error.message);
  }
}

exchangeCodeForToken();
</script>

<template>
  <div>Loading...</div>
</template>