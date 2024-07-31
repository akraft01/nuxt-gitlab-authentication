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
        <u-button
          icon="i-heroicons-book-open"
          to="https://ui.nuxt.com"
          target="_blank"
        >
          Open Nuxt UI Documentation
        </u-button>
      </u-card>
    </u-container>
  </div>
</template>
