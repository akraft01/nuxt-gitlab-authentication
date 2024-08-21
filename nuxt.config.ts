import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  app: {
    baseURL: '/nuxt-gitlab-authentication-experiment/',
    head: {
      title: 'GitLab Repo Viewer',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { hid: 'description', name: 'description', content: 'View your GitLab repositories easily with this app.' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ],
    },
  },

  devtools: { enabled: true },
  modules: ['@nuxt/ui'],

  vite: {
    resolve: {
      alias: {
        '~/app': './app', 
      },
    },
  },

  compatibilityDate: '2024-08-12',

  ssr: false
});