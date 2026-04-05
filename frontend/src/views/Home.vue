<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Shield, Zap, MessageCircle, ChevronLeft } from 'lucide-vue-next'
import { useMagnetic } from '@/composables/useMagnetic'

gsap.registerPlugin(ScrollTrigger)

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const submitBtnRef = ref<HTMLElement | null>(null)
useMagnetic(submitBtnRef, { strength: 0.2, scale: 1.05 })

const phone = ref('')
const countryCode = ref('+20')
const isLoading = ref(false)
const errorMsg = ref('')

let ctx: gsap.Context | null = null

async function handleSubmit() {
  if (!phone.value || phone.value.length < 10) {
    errorMsg.value = 'ادخل رقم هاتف صحيح'
    return
  }
  isLoading.value = true
  errorMsg.value = ''

  const result = await auth.requestOtp({
    phone: phone.value,
    countryCode: countryCode.value,
  })

  isLoading.value = false

  if (result.success) {
    const resultData = (result as any).data;
    if (resultData?.devCode) {
      window.alert(resultData.message)
    }
    router.push({ name: 'OtpInput' })
  } else {
    errorMsg.value = result.message || 'حدث خطأ'
  }
}

onMounted(() => {
  ctx = gsap.context(() => {
    // ── Hero entrance timeline ──
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.fromTo('.hero-badge',
        { opacity: 0, y: -20, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6 })
      .fromTo('.hero-title .word',
        { opacity: 0, y: 50, rotationX: -40, filter: 'blur(10px)' },
        { opacity: 1, y: 0, rotationX: 0, filter: 'blur(0px)', duration: 0.7, stagger: 0.08 },
        '-=0.3')
      .fromTo('.hero-subtitle',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5 },
        '-=0.4')
      .fromTo('.search-card',
        { opacity: 0, y: 50, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.4)' },
        '-=0.3')
      .fromTo('.kiosk-link',
        { opacity: 0 },
        { opacity: 1, duration: 0.4 },
        '-=0.3')

    // ── Scroll-triggered features (lazy reveal) ──
    gsap.fromTo('.feature-item',
      { opacity: 0, y: 40, scale: 0.95 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        stagger: 0.12,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.features-grid',
          start: 'top 85%',
          end: 'bottom 60%',
          toggleActions: 'play none none none',
        }
      }
    )

    // ── Parallax effect on hero section ──
    gsap.to('.hero-badge', {
      y: -30,
      scrollTrigger: {
        trigger: '.hero-section',
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
      }
    })

    gsap.to('.hero-header', {
      y: -60,
      opacity: 0.3,
      scrollTrigger: {
        trigger: '.hero-section',
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
      }
    })

    // ── Glow line animation ──
    gsap.fromTo('.glow-line',
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 1,
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: '.glow-line',
          start: 'top 90%',
          toggleActions: 'play none none none',
        }
      }
    )
  })
})

onUnmounted(() => {
  ctx?.revert()
})
</script>

<template>
  <div class="home-page">
    <!-- Floating Orbs Background -->
    <div class="floating-orbs">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <!-- Navbar -->
    <header class="flat-header">
      <div class="nav-brand">
        <img src="/logo.png" alt="هارد وير" class="nav-logo" />
        <span class="nav-title">هارد وير</span>
      </div>
    </header>

    <div class="container hero-container">
      <div class="hero-section">
        <!-- Badge -->
        <div class="hero-badge">
          <span class="badge-dot"></span>
          متاح الآن — تابع جهازك لحظياً
        </div>

        <div class="hero-header">
          <h1 class="hero-title heading-serif">
            <span class="word" v-for="(word, i) in t('home.title').split(' ')" :key="i">{{ word }}&nbsp;</span>
          </h1>
          <p class="hero-subtitle">{{ t('home.subtitle') }}</p>
        </div>

        <div class="hero-action">
          <div class="card search-card card-hover-glow">
            <h2 class="search-title">تتبع حالة جهازك</h2>
            <!-- Phone Form -->
            <form class="phone-form" @submit.prevent="handleSubmit" id="phone-form">
              <div class="input-group">
                <select v-model="countryCode" class="country-select" id="country-code">
                  <option value="+20">🇪🇬 +20</option>
                  <option value="+966">🇸🇦 +966</option>
                  <option value="+971">🇦🇪 +971</option>
                </select>
                <input
                  v-model="phone"
                  type="tel"
                  class="input phone-input"
                  :placeholder="t('home.phonePlaceholder')"
                  dir="ltr"
                  maxlength="11"
                  id="phone-input"
                />
              </div>

              <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

              <button
                ref="submitBtnRef"
                type="submit"
                class="btn btn-primary submit-btn glow-primary"
                :disabled="isLoading"
                id="submit-btn"
              >
                <span v-if="isLoading" class="spinner"></span>
                <span v-else>{{ t('home.submit') }}</span>
              </button>
            </form>

            <!-- Kiosk Link -->
            <router-link :to="{ name: 'Kiosk' }" class="kiosk-link" id="kiosk-link">
              {{ t('home.orKiosk') }}
              <ChevronLeft :size="16" />
            </router-link>
          </div>
        </div>

        <!-- Glow line separator -->
        <div class="glow-line"></div>

        <!-- Features -->
        <div class="features-grid">
          <div class="feature-item card-tilt glow-accent">
            <div class="feature-icon">
              <Zap :size="22" />
            </div>
            <div class="feature-text">
              <h3>تتبع لحظي</h3>
              <p>تابع حالة جهازك لحظة بلحظة بتحديث تلقائي</p>
            </div>
          </div>
          <div class="feature-item card-tilt glow-primary">
            <div class="feature-icon feature-icon--green">
              <MessageCircle :size="22" />
            </div>
            <div class="feature-text">
              <h3>إشعارات واتساب</h3>
              <p>هنبعتلك على واتساب أي تحديث يحصل</p>
            </div>
          </div>
          <div class="feature-item card-tilt glow-primary">
            <div class="feature-icon feature-icon--purple">
              <Shield :size="22" />
            </div>
            <div class="feature-text">
              <h3>دعم فني مباشر</h3>
              <p>كلمنا من داخل التطبيق في أي وقت</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg);
  position: relative;
}

/* ── Flat Header ── */
.flat-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-8);
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--glass-border);
  position: sticky;
  top: 0;
  z-index: 30;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.nav-logo {
  height: 42px;
  width: 42px;
  object-fit: contain;
  border-radius: var(--radius-md);
}

.nav-title {
  font-weight: 800;
  font-size: var(--text-xl);
  color: var(--color-text);
  letter-spacing: -0.5px;
  font-family: var(--font-arabic);
}

.brand-4 {
  color: var(--color-magenta, #A82C6A);
  font-family: var(--font-latin);
  font-weight: 900;
}

/* ── Hero Container ── */
.hero-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: var(--space-8) var(--space-4);
}

.hero-section {
  text-align: center;
  max-width: 800px;
  width: 100%;
}

/* ── Badge ── */
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-accent) 20%, transparent);
  margin-bottom: var(--space-6);
  will-change: transform;
}

.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22C55E;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}

.hero-header {
  margin-bottom: var(--space-8);
  will-change: transform, opacity;
}

.hero-title {
  font-size: clamp(2rem, 6vw, 3.5rem);
  line-height: 1.15;
  color: var(--color-text);
  margin-bottom: var(--space-4);
  letter-spacing: -1px;
  perspective: 600px;
}

.hero-title .word {
  display: inline-block;
  will-change: transform, opacity, filter;
}

.hero-subtitle {
  font-size: var(--text-lg);
  color: var(--color-text-muted);
  max-width: 500px;
  margin: 0 auto;
  line-height: 1.7;
}

.hero-action {
  max-width: 480px;
  margin: 0 auto;
}

.search-card {
  padding: var(--space-8);
  border-top: 3px solid var(--color-primary);
}

.search-title {
  font-size: var(--text-xl);
  font-weight: 700;
  margin-bottom: var(--space-6);
  text-align: right;
}

.phone-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.input-group {
  display: flex;
  gap: var(--space-2);
  direction: ltr;
}

.country-select {
  padding: 0 var(--space-3);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-weight: 600;
  cursor: pointer;
  outline: none;
  width: 100px;
  font-family: inherit;
}

.phone-input {
  flex: 1;
  text-align: left;
  letter-spacing: 2px;
  font-size: var(--text-lg);
  padding: var(--space-4);
  font-weight: 600;
}

.submit-btn {
  width: 100%;
  padding: var(--space-4);
  font-size: var(--text-lg);
  font-weight: 700;
}

.kiosk-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-weight: 600;
  margin-top: var(--space-4);
  transition: color var(--transition-fast);
}
.kiosk-link:hover {
  color: var(--color-primary);
}

.error-msg {
  color: #EF4444;
  font-size: var(--text-sm);
  text-align: center;
  font-weight: 600;
}

.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Features Section ── */
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  margin-top: var(--space-6);
  text-align: right;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  transition: background var(--transition-fast), transform var(--transition-fast);
  background: color-mix(in srgb, var(--color-surface) 40%, transparent);
  border: 1px solid transparent;
}

.feature-item:hover {
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
  border-color: var(--glass-border);
}

.feature-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feature-icon--green {
  background: rgba(34, 197, 94, 0.1);
  color: #22C55E;
}

.feature-icon--purple {
  background: rgba(168, 44, 106, 0.1);
  color: #A82C6A;
}

.feature-text h3 {
  font-size: var(--text-sm);
  font-weight: 700;
  margin-bottom: var(--space-1);
}

.feature-text p {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  line-height: 1.5;
}

@media (max-width: 768px) {
  .flat-header {
    padding: var(--space-3) var(--space-4);
  }
  .search-card {
    padding: var(--space-6);
  }
  .features-grid {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }
  .hero-title {
    font-size: clamp(1.75rem, 8vw, 2.5rem);
  }
}

/* Desktop 2-column layout */
@media (min-width: 1024px) {
  .hero-section {
    max-width: 1000px;
  }
  .hero-container {
    padding: var(--space-16) var(--space-8);
  }
}
</style>
