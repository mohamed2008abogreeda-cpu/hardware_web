<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import StarRating from '@/components/StarRating.vue'
import api from '@/services/api'
import { gsap } from 'gsap'

const route = useRoute()
const deviceCode = route.params.deviceCode as string

const ratingSpeed = ref(0)
const ratingQuality = ref(0)
const ratingHandling = ref(0)
const comment = ref('')
const isSubmitting = ref(false)
const isSubmitted = ref(false)
const errorMsg = ref('')

let ctx: gsap.Context | null = null

onMounted(() => {
  ctx = gsap.context(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl.fromTo('.rating-card',
        { opacity: 0, y: 40, scale: 0.93 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.3)' })
      .fromTo('.rating-card h1',
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.4 },
        '-=0.3')
      .fromTo('.code-display',
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.3 },
        '-=0.1')
      .fromTo('.ratings-section > *',
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.35, stagger: 0.1 },
        '-=0.1')
      .fromTo('.comment-input',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.3 },
        '-=0.1')
      .fromTo('.submit-btn',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.3 },
        '-=0.1')
  })
})

onUnmounted(() => {
  ctx?.revert()
})

async function submitRating() {
  if (ratingSpeed.value === 0 || ratingQuality.value === 0 || ratingHandling.value === 0) {
    errorMsg.value = 'يرجى تقييم جميع المعايير'
    return
  }

  isSubmitting.value = true
  errorMsg.value = ''

  try {
    const res = await api.post(`/api/ratings/${deviceCode}`, {
      type: 'service',
      rating_speed: ratingSpeed.value,
      rating_quality: ratingQuality.value,
      rating_handling: ratingHandling.value,
      comment: comment.value || undefined,
    })

    if (res.data.success) {
      isSubmitted.value = true

      // ── Celebration animation ──
      gsap.fromTo('.success-icon',
        { scale: 0, rotation: -360 },
        { scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' }
      )
      gsap.fromTo('.success-card h1',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, delay: 0.3 }
      )

      // Create celebration particles
      const container = document.querySelector('.success-card')
      if (container) {
        for (let i = 0; i < 15; i++) {
          const particle = document.createElement('div')
          particle.textContent = ['⭐', '🌟', '✨', '💫'][i % 4]
          particle.style.cssText = `
            position: absolute;
            font-size: ${14 + Math.random() * 14}px;
            top: 30%; left: 50%;
            pointer-events: none;
            z-index: 10;
          `
          container.appendChild(particle)

          const angle = (i / 15) * Math.PI * 2
          const distance = 60 + Math.random() * 80
          gsap.fromTo(particle,
            { x: 0, y: 0, opacity: 1, scale: 1 },
            {
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance - 30,
              opacity: 0,
              scale: 0.3,
              duration: 1 + Math.random() * 0.5,
              ease: 'power2.out',
              onComplete: () => particle.remove()
            }
          )
        }
      }
    }
  } catch {
    errorMsg.value = 'حدث خطأ، حاول مرة أخرى'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="rating-page">
    <div class="container">
      <!-- Success State -->
      <div v-if="isSubmitted" class="card-glass rating-card success-card">
        <div class="success-icon">🌟</div>
        <h1>شكراً لتقييمك!</h1>
        <p class="text-muted">تقييمك يساعدنا على التحسين المستمر</p>
        <router-link :to="{ name: 'Home' }" class="btn btn-primary">
          العودة للرئيسية
        </router-link>
      </div>

      <!-- Rating Form -->
      <div v-else class="card-glass rating-card">
        <h1>تقييم الخدمة ⭐</h1>
        <p class="subtitle">كيف كانت تجربتك مع خدمة الصيانة؟</p>

        <div class="code-display">
          <span class="code-label">كود الجهاز</span>
          <span class="code-value code">{{ deviceCode }}</span>
        </div>

        <div class="ratings-section">
          <StarRating v-model="ratingSpeed" label="السرعة" />
          <StarRating v-model="ratingQuality" label="الجودة" />
          <StarRating v-model="ratingHandling" label="التعامل" />
        </div>

        <textarea
          v-model="comment"
          class="input comment-input"
          placeholder="أضف ملاحظاتك (اختياري)..."
          rows="3"
          maxlength="500"
          id="rating-comment"
        ></textarea>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

        <button
          class="btn btn-primary submit-btn"
          :disabled="isSubmitting"
          @click="submitRating"
          id="rating-submit"
        >
          <span v-if="isSubmitting" class="spinner"></span>
          <span v-else>إرسال التقييم</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rating-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: var(--space-8); }
.rating-card { text-align: center; padding: var(--space-10) var(--space-8); max-width: 480px; width: 100%; position: relative; overflow: hidden; }
.rating-card h1 { font-size: var(--text-2xl); font-weight: 700; margin-bottom: var(--space-2); }
.subtitle { color: var(--color-text-muted); margin-bottom: var(--space-6); }

.code-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  margin-bottom: var(--space-8);
  padding: var(--space-3);
  background: var(--color-surface-2);
  border-radius: var(--radius-md);
}
.code-label { font-size: var(--text-sm); color: var(--color-text-muted); }
.code-value { font-size: var(--text-lg); font-weight: 700; }

.ratings-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  align-items: center;
}

.comment-input {
  width: 100%;
  resize: vertical;
  margin-bottom: var(--space-4);
  font-family: inherit;
}

.submit-btn { width: 100%; padding: var(--space-4); }
.error-msg { color: #EF4444; font-size: var(--text-sm); margin-bottom: var(--space-4); }

.success-card { display: flex; flex-direction: column; align-items: center; gap: var(--space-4); }
.success-icon { font-size: 4rem; display: inline-block; }
.success-card h1 { color: #22C55E; }
.success-card .btn { margin-top: var(--space-4); }

.spinner {
  display: inline-block; width: 20px; height: 20px;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
  border-radius: 50%; animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
