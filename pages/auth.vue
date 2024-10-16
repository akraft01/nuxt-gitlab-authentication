<script setup>
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const router = useRouter();
let codeVerifier = '';

// Dynamically determine REDIRECT_URI based on the environment
let REDIRECT_URI = '';

if (typeof window !== 'undefined') {
  if (window.location.hostname === 'localhost') {
    REDIRECT_URI = 'http://localhost:3000/auth'; // Local environment
  }
  else {
    REDIRECT_URI = ''; // GitLab Pages environment
  }
}

// Safely retrieve code_verifier from localStorage in the client environment
if (typeof window !== 'undefined') {
  codeVerifier = localStorage.getItem('code_verifier');
}

const CLIENT_ID = ''; // Client ID
const CLIENT_SECRET = ''; // Client Secret
const GITLAB_HOST_URL = 'https://gitlab.ca/';

// Get the authorization code from the query parameters
const code = route.query.code;

console.log('Auth page loaded');
console.log('Route object:', route);
console.log('Query params:', route.query);

async function exchangeCodeForToken() {
  if (!code) {
    console.error('No authorization code found in query parameters.');
    await router.push('/'); // Ensure the router.push is awaited to avoid async issues
    return;
  }

  if (!codeVerifier) {
    console.error('No code verifier found in storage.');
    await router.push('/'); // Ensure the router.push is awaited to avoid async issues
    return;
  }

  try {
    console.log('Exchanging code for token...');

    const response = await axios.post(`${GITLAB_HOST_URL}/oauth/token`, {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI, // Use the dynamically set REDIRECT_URI
      code_verifier: codeVerifier,
    });

    const accessToken = response.data.access_token;
    console.log('Access token received:', accessToken);

    // Store the access token in localStorage if the client is present
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken);
    }

    await router.push('/repositories'); // Navigate to the repositories page after successful login
  }
  catch (error) {
    console.error('Error exchanging code for token:', error);
    console.error('Error details:', error.response ? error.response.data : error.message);
  }
}

exchangeCodeForToken(); // Call the function to handle the token exchange
</script>

<template>
  <div>Loading...</div>
</template>
