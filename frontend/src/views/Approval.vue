<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'
import { gsap } from 'gsap'

const route = useRoute()
const token = route.params.token as string

interface ApprovalData {
  id: number
  device_code: string
  amount: number
  status: string
  reason: string | null
  created_at: string
}

const approval = ref<ApprovalData | null>(null)
const isLoading = ref(true)
const isResponding = ref(false)
const responded = ref(false)
const responseStatus = ref<'approved' | 'rejected' | null>(null)
const errorMsg = ref('')
const isExpired = ref(false)
const animatedAmount = ref(0)

let ctx: gsap.Context | null = null

onMounted(async () => {
  try {
    const res = await api.get(`/api/approvals/verify/${token}`)
    if (res.data.success) {
      approval.value = res.data.data
      if (approval.value!.status !== 'pending') {
        responded.value = true
        responseStatus.value = approval.value!.status as 'approved' | 'rejected'
      }
    }
  } catch (err: unknown) {
    const e = err as { response?: { status: number } }
    if (e.response?.status === 410) {
      isExpired.value = true
    } else {
      errorMsg.value = 'رابط غير صالح أو منتهي الصلاحية'
    }
  } finally {
    isLoading.value = false

    ctx = gsap.context(() => {
      // ── Card entrance ──
      gsap.fromTo('.approval-card',
        { opacity: 0, y: 40, scale: 0.93, filter: 'blur(10px)' },
        { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.7, ease: 'power3.out' }
      )

      // ── Amount counter animation ──
      if (approval.value && !responded.value) {
        const target = approval.value.amount
        const counter = { val: 0 }
        gsap.to(counter, {
          val: target,
          duration: 1.5,
          delay: 0.5,
          ease: 'power2.out',
          onUpdate: () => {
            animatedAmount.value = Math.round(counter.val)
          }
        })

        // ── Button pulse attention animation ──
        gsap.fromTo('.btn-approve',
          { scale: 1 },
          { scale: 1.03, duration: 0.8, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 1.5 }
        )
      }

      // ── Response icon ──
      if (responded.value) {
        gsap.fromTo('.response-icon',
          { scale: 0, rotation: -180 },
          { scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' }
        )
      }
    })
  }
})

onUnmounted(() => {
  ctx?.revert()
})

async function respond(status: 'approved' | 'rejected') {
  isResponding.value = true
  try {
    const res = await api.post(`/api/approvals/respond/${token}`, { status })
    if (res.data.success) {
      responded.value = true
      responseStatus.value = status

      // Success animation
      gsap.fromTo('.response-icon',
        { scale: 0, rotation: -180 },
        { scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' }
      )

      // Celebrate particles effect
      if (status === 'approved') {
        createCelebration()
      }
    }
  } catch {
    errorMsg.value = 'حدث خطأ، حاول مرة أخرى'
  } finally {
    isResponding.value = false
  }
}

function createCelebration() {
  const container = document.querySelector('.approval-card')
  if (!container) return

  for (let i = 0; i < 12; i++) {
    const particle = document.createElement('div')
    particle.style.cssText = `
      position: absolute;
      width: 8px; height: 8px;
      border-radius: 50%;
      background: ${['#22C55E', '#C5A059', '#3B82F6', '#A82C6A'][i % 4]};
      top: 50%; left: 50%;
      pointer-events: none;
      z-index: 10;
    `
    container.appendChild(particle)

    const angle = (i / 12) * Math.PI * 2
    const distance = 80 + Math.random() * 60
    gsap.fromTo(particle,
      { x: 0, y: 0, scale: 1, opacity: 1 },
      {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        scale: 0,
        opacity: 0,
        duration: 0.8 + Math.random() * 0.4,
        ease: 'power2.out',
        onComplete: () => particle.remove()
      }
    )
  }
}
</script>

<template>
  <div class="approval-page">
    <div class="container">
      <!-- Loading -->
      <div v-if="isLoading" class="card-glass approval-card">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
      </div>

      <!-- Expired -->
      <div v-else-if="isExpired" class="card-glass approval-card expired">
        <div class="status-icon">⌛</div>
        <h1>انتهت صلاحية الرابط</h1>
        <p class="desc">هذا الرابط لم يعد صالحاً. تواصل مع الدعم الفني للمساعدة.</p>
      </div>

      <!-- Error -->
      <div v-else-if="errorMsg" class="card-glass approval-card error-card">
        <div class="status-icon">⚠️</div>
        <h1>خطأ</h1>
        <p class="desc">{{ errorMsg }}</p>
      </div>

      <!-- Already Responded -->
      <div v-else-if="responded" class="card-glass approval-card">
        <div class="response-icon">{{ responseStatus === 'approved' ? '✅' : '❌' }}</div>
        <h1>{{ responseStatus === 'approved' ? 'تم الموافقة' : 'تم الرفض' }}</h1>
        <p class="desc">شكراً لردك. سيتم إبلاغ الفني فوراً.</p>
        <div v-if="approval" class="amount-display">
          <span class="amount-label">التكلفة</span>
          <span class="amount-value number">{{ approval.amount }} ج.م</span>
        </div>
      </div>

      <!-- Pending Approval -->
      <div v-else-if="approval" class="card-glass approval-card">
        <h1>طلب موافقة على التكلفة</h1>
        <p class="desc">يرجى مراجعة التكلفة التالية والموافقة أو الرفض</p>

        <div class="device-info">
          <span class="device-label">كود الجهاز</span>
          <span class="device-code code">{{ approval.device_code }}</span>
        </div>

        <div class="amount-display highlight">
          <span class="amount-label">التكلفة المطلوبة</span>
          <span class="amount-value number counter-num">{{ animatedAmount || approval.amount }} ج.م</span>
        </div>

        <p v-if="approval.reason" class="reason">
          <strong>السبب:</strong> {{ approval.reason }}
        </p>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

        <div class="action-buttons">
          <button
            class="btn btn-approve"
            :disabled="isResponding"
            @click="respond('approved')"
            id="approve-btn"
          >
            ✅ موافق
          </button>
          <button
            class="btn btn-reject"
            :disabled="isResponding"
            @click="respond('rejected')"
            id="reject-btn"
          >
            ❌ رفض
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.approval-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: var(--space-8); }
.approval-card { text-align: center; padding: var(--space-10) var(--space-8); max-width: 480px; width: 100%; position: relative; overflow: hidden; }
.approval-card h1 { font-size: var(--text-2xl); font-weight: 700; margin-bottom: var(--space-2); }
.desc { color: var(--color-text-muted); margin-bottom: var(--space-6); line-height: 1.7; }

.status-icon, .response-icon { font-size: 4rem; margin-bottom: var(--space-4); display: inline-block; }

.device-info {
  display: flex; align-items: center; justify-content: center; gap: var(--space-3);
  padding: var(--space-3); background: var(--color-surface-2); border-radius: var(--radius-md); margin-bottom: var(--space-6);
}
.device-label { font-size: var(--text-sm); color: var(--color-text-muted); }
.device-code { font-size: var(--text-lg); font-weight: 700; }

.amount-display {
  display: flex; flex-direction: column; align-items: center; gap: var(--space-2);
  padding: var(--space-6); border-radius: var(--radius-lg); margin-bottom: var(--space-6);
}
.amount-display.highlight { background: rgba(0,212,255,0.06); border: 1px solid rgba(0,212,255,0.2); }
.amount-label { font-size: var(--text-sm); color: var(--color-text-muted); }
.amount-value { font-size: var(--text-4xl); font-weight: 900; color: var(--color-accent); }

.reason { font-size: var(--text-sm); color: var(--color-text-muted); margin-bottom: var(--space-6); background: var(--color-surface-2); padding: var(--space-3); border-radius: var(--radius-md); }

.error-msg { color: #EF4444; font-size: var(--text-sm); margin-bottom: var(--space-4); }

.action-buttons { display: flex; gap: var(--space-4); }
.btn-approve { flex: 1; padding: var(--space-4); background: #22C55E; color: white; border: none; border-radius: var(--radius-md); font-size: var(--text-lg); font-weight: 700; cursor: pointer; font-family: inherit; transition: all var(--transition-fast); will-change: transform; }
.btn-approve:hover { background: #16A34A; transform: translateY(-2px); }
.btn-reject { flex: 1; padding: var(--space-4); background: #EF4444; color: white; border: none; border-radius: var(--radius-md); font-size: var(--text-lg); font-weight: 700; cursor: pointer; font-family: inherit; transition: all var(--transition-fast); }
.btn-reject:hover { background: #DC2626; transform: translateY(-2px); }
.btn-approve:disabled, .btn-reject:disabled { opacity: 0.5; cursor: default; transform: none; }

.expired h1 { color: #F59E0B; }
</style>
