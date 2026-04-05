<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '@/services/api'
import { gsap } from 'gsap'
import { Laptop, MessageSquare, Clock, Bell, Star, TrendingUp, ArrowUpRight, ShieldCheck, BellOff, Info } from 'lucide-vue-next'
import { usePush } from '@/composables/usePush'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js'
import { Doughnut, Bar } from 'vue-chartjs'

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler)

interface DashboardStats {
  devicesTracked: number
  unreadMessages: number
  pendingApprovals: number
  recentEvents: number
  avgRating: number
  chartData?: {
    donut?: { labels: string[], data: number[] }
    line?: { labels: string[], data: number[] }
    trends?: { labels: string[], data: number[] }
    faults?: { label: string, count: number }[]
    techs?: { labels: string[], data: number[] }
  }
}

interface DeviceEvent {
  id: number
  device_code: string
  event_type: string
  old_value: string | null
  new_value: string
  created_at: string
}

const stats = ref<DashboardStats | null>(null)
const events = ref<DeviceEvent[]>([])
const isLoading = ref(true)
const { isSupported, isSubscribed, subscribe, checkSubscription, isLoading: isPushLoading } = usePush()

onMounted(async () => {
  checkSubscription()
  try {
    const [statsRes, eventsRes] = await Promise.all([
      api.get('/api/admin/stats'),
      api.get('/api/admin/events?limit=20'),
    ])
    if (statsRes.data.success) stats.value = statsRes.data.data
    if (eventsRes.data.success) events.value = eventsRes.data.data
  } catch {
    // Will show empty state
  } finally {
    isLoading.value = false

    // Animate stat cards
    gsap.fromTo('.stat-card',
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.5)', stagger: 0.08 }
    )
  }
})

const statCards = [
  { key: 'devicesTracked', label: 'أجهزة متابعة', icon: Laptop, color: '#3B82F6' },
  { key: 'unreadMessages', label: 'رسائل غير مقروءة', icon: MessageSquare, color: '#F59E0B' },
  { key: 'pendingApprovals', label: 'انتظار موافقة', icon: Clock, color: '#EF4444' },
  { key: 'recentEvents', label: 'أحداث اليوم', icon: Bell, color: '#22C55E' },
  { key: 'avgRating', label: 'متوسط التقييم', icon: Star, color: '#F97316' },
]

// Status distribution chart data
const statusChartData = computed(() => {
  const dynamicLabels = stats.value?.chartData?.donut?.labels || ['قيد الفحص', 'قيد الإصلاح', 'انتظار موافقة', 'جاهز للاستلام', 'تم التسليم'];
  const dynamicData = stats.value?.chartData?.donut?.data || [0, 0, 0, 0, 0];
  
  return {
    labels: dynamicLabels,
    datasets: [{
      data: dynamicData,
      backgroundColor: ['#3B82F6', '#F59E0B', '#EF4444', '#22C55E', '#10B981', '#6366F1', '#8B5CF6'],
      borderWidth: 0,
      hoverOffset: 6,
    }]
  }
})

const statusChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      rtl: true,
      labels: {
        padding: 16,
        usePointStyle: true,
        pointStyleWidth: 10,
        font: { family: 'Tajawal, sans-serif', size: 12 },
      },
    },
  },
}

// Weekly activity chart
const weeklyChartData = computed(() => {
  const dynamicLabels = stats.value?.chartData?.trends?.labels || ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const dynamicData = stats.value?.chartData?.trends?.data || [0, 0, 0, 0, 0, 0, 0];

  return {
    labels: dynamicLabels,
    datasets: [{
      label: 'أجهزة مستلمة يومياً',
      data: dynamicData,
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
      borderColor: '#3B82F6',
      borderWidth: 2,
      borderRadius: 6,
      maxBarThickness: 32,
    }]
  }
})

// Fault trends chart
const faultChartData = computed(() => {
  const data = stats.value?.chartData?.faults || []
  return {
    labels: data.map(d => d.label),
    datasets: [{
      label: 'أكثر الأعطال تكراراً',
      data: data.map(d => d.count),
      backgroundColor: '#6366F1',
      borderRadius: 4,
    }]
  }
})

// Technician workload chart
const techChartData = computed(() => {
  const data = stats.value?.chartData?.techs || { labels: [], data: [] }
  return {
    labels: data.labels,
    datasets: [{
      label: 'توزيع العمل على الفنيين',
      data: data.data,
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
      borderRadius: 4,
      indexAxis: 'y' as const,
    }]
  }
})

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { mode: 'index' as const, intersect: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { family: 'Tajawal' } } },
    y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: 'Tajawal' } } },
  },
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`
  return `${Math.floor(diff / 86400)} يوم`
}

function eventIcon(type: string): string {
  const icons: Record<string, string> = {
    'NEW_DEVICE': '🆕',
    'STATUS_CHANGED': '🔄',
    'APPROVAL_APPROVED': '✅',
    'APPROVAL_REJECTED': '❌',
    'CLIENT_ENROUTE': '🚗',
  }
  return icons[type] || '📌'
}
</script>

<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div>
        <h1 class="page-title">لوحة التحكم</h1>
        <p class="page-subtitle">نظرة عامة على النظام</p>
      </div>
      
      <!-- Push Notification Prompt -->
      <div v-if="isSupported && !isSubscribed" class="push-prompt-inline card">
        <div class="prompt-content">
          <div class="icon-pulse"><Bell :size="18" /></div>
          <div class="text">
            <strong>تفعيل التنبيهات</strong>
            <p>ليصلك إشعار بالرسائل الجديدة فوراً</p>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" @click="subscribe" :disabled="isPushLoading">
          {{ isPushLoading ? 'جاري...' : 'تفعيل الآن' }}
        </button>
      </div>

      <div v-else-if="isSubscribed" class="push-status-tag">
        <ShieldCheck :size="14" />
        <span>التنبيهات مفعلة</span>
      </div>
    </div>

    <!-- Stat Cards -->
    <div v-if="isLoading" class="stats-grid">
      <div v-for="i in 5" :key="i" class="card stat-card">
        <div class="skeleton skeleton-badge"></div>
        <div class="skeleton skeleton-title"></div>
      </div>
    </div>

    <div v-else class="stats-grid">
      <div
        v-for="card in statCards"
        :key="card.key"
        class="card stat-card"
        :style="{ '--card-color': card.color }"
      >
        <div class="stat-header">
          <span class="stat-label">{{ card.label }}</span>
          <div class="stat-icon-wrapper"><component :is="card.icon" :size="22" /></div>
        </div>
        <div class="stat-value-row">
          <div class="stat-value number">
            {{ stats ? (stats as Record<string, unknown>)[card.key] : 0 }}
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="charts-row">
      <div class="card chart-card">
        <h2 class="chart-title">
          <TrendingUp :size="20" />
          نشاط الأسبوع
        </h2>
        <div class="chart-container">
          <Bar :data="weeklyChartData" :options="barOptions" />
        </div>
      </div>

      <div class="card chart-card chart-card--small">
        <h2 class="chart-title">توزيع الحالات</h2>
        <div class="chart-container chart-container--donut">
          <Doughnut :data="statusChartData" :options="statusChartOptions" />
        </div>
      </div>
    </div>

    <!-- Power Analytics Row -->
    <div class="charts-row">
      <div class="card chart-card">
        <h2 class="chart-title">
          <TrendingUp :size="20" />
          أكثر الأعطال تكراراً
        </h2>
        <div class="chart-container">
          <Bar :data="faultChartData" :options="barOptions" />
        </div>
      </div>

      <div class="card chart-card">
        <h2 class="chart-title">أداء الفنيين</h2>
        <div class="chart-container">
          <Bar :data="techChartData" :options="barOptions" />
        </div>
      </div>
    </div>

    <!-- Recent Events -->
    <div class="section">
      <h2 class="section-title">أحداث حديثة</h2>

      <div v-if="events.length === 0" class="empty-state">
        <p>لا توجد أحداث حديثة</p>
      </div>

      <div v-else class="events-list">
        <div
          v-for="event in events"
          :key="event.id"
          class="event-item card"
        >
          <span class="event-icon">{{ eventIcon(event.event_type) }}</span>
          <div class="event-details">
            <span class="event-code code">{{ event.device_code }}</span>
            <span class="event-type">{{ event.event_type.replace(/_/g, ' ') }}</span>
            <span v-if="event.old_value" class="event-change">
              {{ event.old_value }} → {{ event.new_value }}
            </span>
          </div>
          <span class="event-time">{{ formatTime(event.created_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1200px;
}

.push-prompt-inline {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: 0.75rem 1rem;
  background: var(--color-primary-light);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-lg);
  max-width: 350px;
}

.prompt-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 1;
}

.icon-pulse {
  width: 36px;
  height: 36px;
  background: var(--color-primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 2s infinite;
}

.push-prompt-inline .text strong {
  display: block;
  font-size: 0.875rem;
  color: var(--color-primary);
}

.push-prompt-inline .text p {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin: 0;
}

.push-status-tag {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(105, 108, 255, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(105, 108, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(105, 108, 255, 0); }
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-6);
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: -0.5px;
  margin-bottom: var(--space-1);
}

.page-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.stat-card {
  position: relative;
  text-align: right;
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  overflow: hidden;
}

.stat-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--card-color);
  opacity: 0.6;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-1);
}

.stat-icon-wrapper {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background-color: color-mix(in srgb, var(--card-color) 12%, transparent);
  color: var(--card-color);
}

.stat-label { 
  font-size: 0.875rem; 
  color: var(--color-text-muted); 
  font-weight: 500;
}

.stat-value-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.stat-value { 
  font-size: 1.75rem; 
  font-weight: 700; 
  color: var(--color-text);
  line-height: 1;
}

/* Charts */
.charts-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

@media (max-width: 768px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  padding: var(--space-6);
}

.chart-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-base);
  font-weight: 600;
  margin-bottom: var(--space-4);
  color: var(--color-text);
}

.chart-container {
  height: 260px;
  position: relative;
}

.chart-container--donut {
  height: 280px;
}

.section { margin-bottom: var(--space-8); }
.section-title {
  font-size: var(--text-lg);
  font-weight: 600;
  margin-bottom: var(--space-4);
}

.events-list { display: flex; flex-direction: column; gap: var(--space-2); }
.event-item {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
}
.event-icon { font-size: 1.3rem; }
.event-details { flex: 1; display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
.event-code { font-family: var(--font-latin); font-weight: 600; color: var(--color-primary); font-size: var(--text-sm); }
.event-type { color: var(--color-text-muted); font-size: var(--text-sm); }
.event-change { font-size: var(--text-sm); color: var(--color-accent); }
.event-time { font-size: var(--text-xs); color: var(--color-text-muted); white-space: nowrap; }

.empty-state { text-align: center; padding: var(--space-12); color: var(--color-text-muted); }
</style>
