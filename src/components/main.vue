<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

interface Tool {
  name: string
  path: string
  description: string
  icon: string
}

const tools: Tool[] = [
  {
    name: '习字帖',
    path: '/edu-word',
    description: '输入文章内容，生成字帖图像',
    icon: '📖',
  },
]

function goTo(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="main">
    <header class="main__header">
      <h1>工具箱</h1>
      <p>选择一个工具开始使用</p>
    </header>

    <section class="main__grid">
      <button
        v-for="tool in tools"
        :key="tool.path"
        class="main__card"
        @click="goTo(tool.path)"
      >
        <span class="main__card-icon">{{ tool.icon }}</span>
        <h2 class="main__card-title">{{ tool.name }}</h2>
        <p class="main__card-desc">{{ tool.description }}</p>
      </button>
    </section>
  </div>
</template>

<style scoped>
.main {
  padding: 48px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.main__header {
  text-align: center;
}

.main__header h1 {
  margin-bottom: 16px;
}

.main__header p {
  color: var(--text);
  margin: 0;
}

.main__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
  width: 100%;
  max-width: 800px;
}

.main__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px 20px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;
  font-family: var(--sans);
  text-align: center;
}

.main__card:hover {
  border-color: var(--accent-border);
  box-shadow: var(--shadow);
}

.main__card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.main__card-icon {
  font-size: 40px;
  line-height: 1;
}

.main__card-title {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-h);
  margin: 0;
}

.main__card-desc {
  font-size: 14px;
  color: var(--text);
  margin: 0;
  line-height: 1.5;
}
</style>
