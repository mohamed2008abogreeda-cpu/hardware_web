<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '@/services/api'

const avgRating = ref<{ avgSpeed: number; avgQuality: number; avgHandling: number; totalCount: number } | null>(null)
const eventCounts = ref<Record<string, number>>({})
const isLoading = ref(true)

const overallAvg = computed(() => {
  if (!avgRating.value) return 0
  return ((avgRating.value.avgSpeed + avgRating.value.avgQuality + avgRating.value.avgHandling) / 3).toFixed(1)
})

onMounted(async () => {
  try {
    const [statsRes, eventsRes] = await Promise.all([
      api.get('/api/admin/stats'),
      api.get('/api/admin/events?limit=200'),
    ])

    if (eventsRes.data.success) {
      const events = eventsRes.data.data as { event_type: string }[]
      for (const ev of events) {
        eventCounts.value[ev.event_type] = (eventCounts.value[ev.event_type] || 0) + 1
      }
    }
  } catch { /* empty */ } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="reports-admin">
    <h1 class="page-title">التقارير</h1>

    <div v-if="isLoading" class="loading">
      <div v-for="i in 4" :key="i" class="skeleton skeleton-text" style="height:100px;margin-bottom:8px"></div>
    </div>

    <div v-else class="reports-grid">
      <!-- Event Breakdown -->
      <div class="card report-card">
        <h3>📊 توزيع الأحداث</h3>
        <div class="event-bars">
          <div v-for="(count, type) in eventCounts" :key="type" class="bar-row">
            <span class="bar-label">{{ String(type).replace(/_/g, ' ') }}</span>
            <div class="bar-track">
              <div
                class="bar-fill"
                :style="{ width: `${Math.min((count / Math.max(...Object.values(eventCounts))) * 100, 100)}%` }"
              ></div>
            </div>
            <span class="bar-value number">{{ count }}</span>
          </div>
        </div>
      </div>

      <!-- Rating Summary -->
      <div class="card report-card">
        <h3>⭐ ملخص التقييمات</h3>
        <div class="rating-summary">
          <div class="big-number">{{ overallAvg }}</div>
          <span class="total-label">متوسط {{ avgRating?.totalCount || 0 }} تقييم</span>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="card report-card">
        <h3>📈 إحصائيات سريعة</h3>
        <p class="report-note">مزيد من التقارير قريباً — تحليل زمني، أداء الفنيين، ومعدل الإنجاز</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reports-admin { max-width: 1000px; }
.page-title { font-size: var(--text-3xl); font-weight: 700; margin-bottom: var(--space-6); }

.reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-4); }
.report-card { padding: var(--space-6); }
.report-card h3 { font-size: var(--text-lg); font-weight: 600; margin-bottom: var(--space-4); }

.event-bars { display: flex; flex-direction: column; gap: var(--space-3); }
.bar-row { display: flex; align-items: center; gap: var(--space-3); }
.bar-label { font-size: var(--text-xs); color: var(--color-text-muted); min-width: 100px; text-transform: capitalize; }
.bar-track { flex: 1; height: 8px; background: var(--color-surface-2); border-radius: var(--radius-full); overflow: hidden; }
.bar-fill { height: 100%; background: var(--gradient-primary); border-radius: var(--radius-full); transition: width 0.5s ease; }
.bar-value { font-size: var(--text-sm); font-weight: 600; min-width: 30px; text-align: left; }

.rating-summary { text-align: center; }
.big-number { font-size: 3rem; font-weight: 900; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.total-label { font-size: var(--text-sm); color: var(--color-text-muted); }

.report-note { color: var(--color-text-muted); font-size: var(--text-sm); line-height: 1.7; }
.loading { display: flex; flex-direction: column; gap: var(--space-2); }
</style>
