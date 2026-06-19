import { createRouter, createWebHistory } from 'vue-router'
import Main from '../components/main.vue'
import EduWord from '../components/edu_word.vue'

const routes = [
  { path: '/', name: 'home', component: Main },
  { path: '/edu-word', name: 'edu-word', component: EduWord },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
