<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/services/api'

interface DeviceEvent {
  id: number
  device_code: string
  event_type: string
  old_value: string | null
  new_value: string
  created_at: string
}

const events = ref<DeviceEvent[]>([])
const isLoading = ref(true)

onMounted(async () => {
  try {
    const res = await api.get('/api/admin/events?limit=100')
    if (res.data.success) events.value = res.data.data
  } catch { /* empty */ } finally {
    isLoading.value = false
  }
})

function eventIcon(type: string): string {
  const m: Record<string, string> = {
    'NEW_DEVICE': '🆕',
    'STATUS_CHANGED': '🔄',
    'APPROVAL_APPROVED': '✅',
    'APPROVAL_REJECTED': '❌',
    'CLIENT_ENROUTE': '🚗',
    'OTP_REQUESTED': '🔑',
    'LOGIN_SUCCESS': '🔓',
    'MAGIC_LINK_GENERATED': '🔗',
  }
  return m[type] || '🔔'
}

function formatTs(ts: string): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`
  return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="notifications-admin">
    <h1 class="page-title">الإشعارات والأحداث</h1>

    <div v-if="isLoading" class="loading">
      <div v-for="i in 8" :key="i" class="skeleton skeleton-text" style="height:60px;margin-bottom:8px"></div>
    </div>

    <div v-else-if="events.length === 0" class="empty-state card">
      <p>🔔 لا توجد أحداث حديثة</p>
    </div>

    <div v-else class="events-feed">
      <div
        v-for="ev in events"
        :key="ev.id"
        class="card event-card"
      >
        <div class="event-icon">{{ eventIcon(ev.event_type) }}</div>
        <div class="event-body">
          <div class="event-top">
            <span class="event-type">{{ ev.event_type.replace(/_/g, ' ') }}</span>
            <span class="event-time">{{ formatTs(ev.created_at) }}</span>
          </div>
          <span class="event-device code">{{ ev.device_code }}</span>
          <p v-if="ev.old_value && ev.new_value" class="event-detail">
            {{ ev.old_value }} → {{ ev.new_value }}
          </p>
          <p v-else-if="ev.new_value" class="event-detail">{{ ev.new_value }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notifications-admin { max-width: 800px; }
.page-title { font-size: var(--text-3xl); font-weight: 700; margin-bottom: var(--space-6); }

.events-feed { display: flex; flex-direction: column; gap: var(--space-3); }
.event-card { display: flex; align-items: flex-start; gap: var(--space-4); padding: var(--space-4); }
.event-icon { font-size: 1.5rem; flex-shrink: 0; }
.event-body { flex: 1; }
.event-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-1); }
.event-type { font-weight: 600; font-size: var(--text-sm); }
.event-time { font-size: var(--text-xs); color: var(--color-text-muted); }
.event-device { font-size: var(--text-sm); }
.event-detail { font-size: var(--text-sm); color: var(--color-accent); margin-top: var(--space-1); }

.empty-state { text-align: center; padding: var(--space-12); color: var(--color-text-muted); font-size: var(--text-lg); }
.loading { display: flex; flex-direction: column; gap: var(--space-2); }
</style>
