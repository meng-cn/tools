<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
</script>

<template>
  <nav v-if="route.path !== '/'" class="app__nav">
    <button class="app__back-btn" @click="router.push('/')">
      ← 返回首页
    </button>
  </nav>
  <router-view />
</template>

<style scoped>
.app__nav {
  padding: 16px 32px;
  border-bottom: 1px solid var(--border);
}

.app__back-btn {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  font-size: 14px;
  font-family: var(--sans);
  color: var(--accent);
  background: var(--accent-bg);
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.app__back-btn:hover {
  border-color: var(--accent-border);
}
</style>
