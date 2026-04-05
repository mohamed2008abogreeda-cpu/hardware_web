<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import api from '@/services/api'
import { gsap } from 'gsap'

interface HealthData {
  database: {
    access: { status: string }
    sqlite: { status: string }
  }
  polling: {
    devicesTracked: number
    dbConnected: boolean
  }
  activeSessions: number
  sqliteSize: string
  uptime: string
  memory: {
    rss: string
    heap: string
  }
  timestamp: string
}

const health = ref<HealthData | null>(null)
const isLoading = ref(true)
let interval: ReturnType<typeof setInterval> | null = null

async function fetchHealth() {
  try {
    const res = await api.get('/api/admin/health')
    if (res.data.success) health.value = res.data.data
  } catch {
    // silent fail
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await fetchHealth()
  // Refresh every 30 seconds
  interval = setInterval(fetchHealth, 30000)

  gsap.fromTo('.health-card',
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.3, stagger: 0.05 }
  )
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})

function statusColor(status: string): string {
  return status === 'connected' || status === 'up' ? '#22C55E' : '#EF4444'
}

function statusIcon(status: string): string {
  return status === 'connected' || status === 'up' ? '🟢' : '🔴'
}
</script>

<template>
  <div class="health-page">
    <h1 class="page-title">صحة النظام</h1>

    <div v-if="isLoading" class="health-grid">
      <div v-for="i in 6" :key="i" class="card health-card">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
      </div>
    </div>

    <div v-else-if="health" class="health-grid">
      <!-- Access DB -->
      <div class="card health-card">
        <div class="health-header">
          <span>{{ statusIcon(health.database.access.status) }}</span>
          <h3>Access Database</h3>
        </div>
        <div class="health-value" :style="{ color: statusColor(health.database.access.status) }">
          {{ health.database.access.status === 'connected' ? 'متصل' : 'منقطع' }}
        </div>
        <div class="health-detail">أجهزة متابعة: <span class="number">{{ health.polling.devicesTracked }}</span></div>
      </div>

      <!-- SQLite -->
      <div class="card health-card">
        <div class="health-header">
          <span>{{ statusIcon(health.database.sqlite.status) }}</span>
          <h3>SQLite</h3>
        </div>
        <div class="health-value" :style="{ color: statusColor(health.database.sqlite.status) }">
          {{ health.database.sqlite.status === 'connected' ? 'متصل' : 'منقطع' }}
        </div>
        <div class="health-detail">الحجم: <span class="number">{{ health.sqliteSize }}</span></div>
      </div>

      <!-- Sessions -->
      <div class="card health-card">
        <div class="health-header">
          <span>👥</span>
          <h3>الجلسات النشطة</h3>
        </div>
        <div class="health-value number">{{ health.activeSessions }}</div>
      </div>

      <!-- Uptime -->
      <div class="card health-card">
        <div class="health-header">
          <span>⏱️</span>
          <h3>مدة التشغيل</h3>
        </div>
        <div class="health-value number">{{ health.uptime }}</div>
      </div>

      <!-- Memory RSS -->
      <div class="card health-card">
        <div class="health-header">
          <span>🧠</span>
          <h3>الذاكرة (RSS)</h3>
        </div>
        <div class="health-value number">{{ health.memory.rss }}</div>
        <div class="health-detail">Heap: <span class="number">{{ health.memory.heap }}</span></div>
      </div>

      <!-- Last Check -->
      <div class="card health-card">
        <div class="health-header">
          <span>🔄</span>
          <h3>آخر فحص</h3>
        </div>
        <div class="health-value" style="font-size: var(--text-sm)">
          {{ new Date(health.timestamp).toLocaleString('ar-EG') }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.health-page { max-width: 1200px; }
.page-title { font-size: var(--text-3xl); font-weight: 700; margin-bottom: var(--space-8); }

.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-4);
}

.health-card { padding: var(--space-6); }
.health-header { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-3); }
.health-header h3 { font-size: var(--text-base); font-weight: 600; }
.health-value { font-size: var(--text-2xl); font-weight: 700; margin-bottom: var(--space-2); }
.health-detail { font-size: var(--text-sm); color: var(--color-text-muted); }
</style>
