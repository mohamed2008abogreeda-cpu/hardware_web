<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'
import StatusTimeline from '@/components/StatusTimeline.vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const route = useRoute()
const token = route.params.token as string

interface SharedDevice {
  rep_code: string
  rep_name: string
  rep_defects: string
  rep_solution: string
  rep_date1: string
  rep_amount: number
  displayStatus: string
}

const device = ref<SharedDevice | null>(null)
const isLoading = ref(true)
const isExpired = ref(false)
const errorMsg = ref('')

let ctx: gsap.Context | null = null

onMounted(async () => {
  try {
    const res = await api.get(`/api/share/${token}`)
    if (res.data.success) device.value = res.data.data
  } catch (err: unknown) {
    const e = err as { response?: { status: number } }
    if (e.response?.status === 410) {
      isExpired.value = true
    } else {
      errorMsg.value = 'رابط غير صالح'
    }
  } finally {
    isLoading.value = false

    ctx = gsap.context(() => {
      // ── Card entrance ──
      gsap.fromTo('.share-card',
        { opacity: 0, y: 30, scale: 0.95, filter: 'blur(6px)' },
        { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.6, ease: 'power3.out' }
      )

      // ── Staggered content reveal ──
      if (device.value) {
        gsap.fromTo('.share-badge, .header-row, .share-card h1',
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, delay: 0.3 }
        )

        // ── Detail items scroll-triggered ──
        gsap.fromTo('.detail-item',
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            stagger: 0.08,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: '.details-grid',
              start: 'top 85%',
              toggleActions: 'play none none none',
            }
          }
        )
      }
    })
  }
})

onUnmounted(() => {
  ctx?.revert()
})
</script>

<template>
  <div class="share-page">
    <div class="container">
      <!-- Loading -->
      <div v-if="isLoading" class="card-glass share-card">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text" style="width:60%"></div>
      </div>

      <!-- Expired -->
      <div v-else-if="isExpired" class="card-glass share-card expired">
        <div class="icon">⌛</div>
        <h1>انتهت صلاحية الرابط</h1>
        <p class="desc">هذا الرابط لم يعد صالحاً (24 ساعة). اطلب رابطاً جديداً من صاحب الجهاز.</p>
      </div>

      <!-- Error -->
      <div v-else-if="errorMsg" class="card-glass share-card">
        <div class="icon">⚠️</div>
        <h1>خطأ</h1>
        <p class="desc">{{ errorMsg }}</p>
      </div>

      <!-- Device Info -->
      <div v-else-if="device" class="card-glass share-card">
        <div class="share-badge">🔗 رابط مشاركة</div>

        <div class="header-row">
          <span class="device-code code">{{ device.rep_code }}</span>
          <span class="status-badge" :data-status="device.displayStatus">
            {{ device.displayStatus }}
          </span>
        </div>

        <h1>{{ device.rep_name }}</h1>

        <StatusTimeline :current-status="device.displayStatus" />

        <div class="details-grid">
          <div class="detail-item">
            <span class="label">العيب</span>
            <span class="value">{{ device.rep_defects }}</span>
          </div>
          <div v-if="device.rep_solution" class="detail-item">
            <span class="label">الحل</span>
            <span class="value">{{ device.rep_solution }}</span>
          </div>
          <div class="detail-item">
            <span class="label">تاريخ الاستلام</span>
            <span class="value">{{ device.rep_date1 }}</span>
          </div>
          <div v-if="device.rep_amount" class="detail-item">
            <span class="label">التكلفة</span>
            <span class="value number amount">{{ device.rep_amount }} ج.م</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.share-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: var(--space-8) var(--space-4); }
.share-card { max-width: 580px; width: 100%; padding: var(--space-8) var(--space-6); }
.share-card h1 { font-size: var(--text-2xl); font-weight: 700; margin-bottom: var(--space-2); }

.icon { font-size: 3rem; margin-bottom: var(--space-4); text-align: center; }
.desc { color: var(--color-text-muted); text-align: center; line-height: 1.7; }

.share-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-3);
  background: rgba(0,212,255,0.1);
  border: 1px solid rgba(0,212,255,0.2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--color-primary);
  margin-bottom: var(--space-4);
}

.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); }
.device-code { font-size: var(--text-lg); font-weight: 700; color: var(--color-primary); }

.details-grid { display: grid; gap: var(--space-4); margin-top: var(--space-4); }
.detail-item { display: flex; flex-direction: column; gap: var(--space-1); will-change: transform, opacity; }
.label { font-size: var(--text-sm); color: var(--color-text-muted); font-weight: 600; }
.value { font-size: var(--text-base); }
.amount { color: var(--color-accent); font-weight: 700; font-size: var(--text-xl); }

.expired h1 { color: #F59E0B; text-align: center; }
</style>
