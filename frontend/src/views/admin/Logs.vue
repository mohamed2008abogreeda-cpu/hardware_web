<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { gsap } from 'gsap'

interface LogEntry {
  id: number
  timestamp: string
  user_type: string
  user_id: string
  action: string
  details: string | null
  ip: string | null
}

const logs = ref<LogEntry[]>([])
const isLoading = ref(true)

onMounted(async () => {
  try {
    const res = await api.get('/api/admin/logs?limit=200')
    if (res.data.success) logs.value = res.data.data
  } catch { /* empty */ } finally {
    isLoading.value = false
    gsap.fromTo('.log-row',
      { opacity: 0 },
      { opacity: 1, duration: 0.15, stagger: 0.01 }
    )
  }
})

function typeIcon(type: string): string {
  const m: Record<string, string> = { customer: '👤', admin: '🔐', system: '⚙️' }
  return m[type] || '📌'
}

function formatTs(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="logs-admin">
    <h1 class="page-title">سجلات النظام</h1>

    <div v-if="isLoading" class="loading">
      <div v-for="i in 10" :key="i" class="skeleton skeleton-text" style="height:36px;margin-bottom:2px"></div>
    </div>

    <div v-else class="table-wrapper card">
      <table class="logs-table">
        <thead>
          <tr>
            <th>الوقت</th>
            <th>النوع</th>
            <th>المستخدم</th>
            <th>الإجراء</th>
            <th>التفاصيل</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id" class="log-row">
            <td class="ts-cell">{{ formatTs(log.timestamp) }}</td>
            <td>{{ typeIcon(log.user_type) }} {{ log.user_type }}</td>
            <td class="code">{{ log.user_id }}</td>
            <td>{{ log.action }}</td>
            <td class="details-cell">{{ log.details || '—' }}</td>
          </tr>
          <tr v-if="logs.length === 0">
            <td colspan="5" class="empty-row">لا توجد سجلات</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.logs-admin { max-width: 1200px; }
.page-title { font-size: var(--text-3xl); font-weight: 700; margin-bottom: var(--space-6); }

.table-wrapper { overflow-x: auto; padding: 0; }
.logs-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
.logs-table th { padding: var(--space-2) var(--space-3); text-align: right; font-weight: 600; color: var(--color-text-muted); border-bottom: 1px solid var(--color-border); white-space: nowrap; }
.logs-table td { padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--color-border); }
.log-row:hover { background: var(--color-surface-2); }
.ts-cell { white-space: nowrap; font-size: var(--text-xs); color: var(--color-text-muted); }
.details-cell { max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--color-text-muted); }
.empty-row { text-align: center; color: var(--color-text-muted); padding: var(--space-8) !important; }
.loading { display: flex; flex-direction: column; gap: var(--space-1); }
</style>
