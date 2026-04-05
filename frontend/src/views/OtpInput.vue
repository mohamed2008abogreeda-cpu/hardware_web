<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const digits = ref<string[]>(['', '', '', '', '', ''])
const isLoading = ref(false)
const errorMsg = ref('')
const countdown = ref(60)
const canResend = ref(false)
const isShaking = ref(false)
let timer: ReturnType<typeof setInterval> | null = null
let ctx: gsap.Context | null = null

onMounted(() => {
  if (!auth.pendingPhone) {
    router.push({ name: 'Home' })
    return
  }
  startCountdown()

  ctx = gsap.context(() => {
    // ── Card entrance ──
    gsap.fromTo('.otp-card',
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.3)' }
    )

    // ── Title + subtitle ──
    gsap.fromTo('.otp-title',
      { opacity: 0, y: -15 },
      { opacity: 1, y: 0, duration: 0.4, delay: 0.2 }
    )
    gsap.fromTo('.otp-subtitle',
      { opacity: 0 },
      { opacity: 1, duration: 0.3, delay: 0.35 }
    )

    // ── OTP boxes stagger entrance ──
    gsap.fromTo('.otp-input',
      { opacity: 0, y: 25, scale: 0.8 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.4,
        stagger: 0.06,
        ease: 'back.out(2)',
        delay: 0.4
      }
    )

    // ── Verify button ──
    gsap.fromTo('.verify-btn',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.3, delay: 0.7 }
    )
  })

  // Focus first input
  setTimeout(() => {
    const first = document.querySelector<HTMLInputElement>('.otp-input')
    first?.focus()
  }, 500)
})

onUnmounted(() => {
  ctx?.revert()
  if (timer) clearInterval(timer)
})

function startCountdown() {
  countdown.value = 60
  canResend.value = false
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      canResend.value = true
      if (timer) clearInterval(timer)
    }
  }, 1000)
}

function handleInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value.replace(/\D/g, '')
  digits.value[index] = value.slice(-1)

  if (value && index < 5) {
    const next = document.querySelectorAll<HTMLInputElement>('.otp-input')[index + 1]
    next?.focus()
  }

  // Auto-verify when all 6 digits entered
  if (digits.value.every(d => d !== '')) {
    verify()
  }
}

function handleKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    const prev = document.querySelectorAll<HTMLInputElement>('.otp-input')[index - 1]
    prev?.focus()
  }
}

async function verify() {
  isLoading.value = true
  errorMsg.value = ''
  const code = digits.value.join('')

  const result = await auth.verifyOtp({
    phone: auth.pendingPhone!,
    code,
  })

  isLoading.value = false

  if (result.success) {
    // Success pulse
    gsap.fromTo('.otp-inputs',
      { scale: 1 },
      { scale: 1.05, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.inOut' }
    )
    setTimeout(() => router.push({ name: 'Track' }), 200)
  } else {
    errorMsg.value = result.message || t('otp.wrongCode')
    // Shake animation on error
    isShaking.value = true
    gsap.fromTo('.otp-inputs',
      { x: 0 },
      {
        x: [-8, 8, -6, 6, -3, 3, 0] as any,
        duration: 0.5,
        ease: 'power2.inOut',
        onComplete: () => { isShaking.value = false }
      }
    )
    digits.value = ['', '', '', '', '', '']
    const first = document.querySelector<HTMLInputElement>('.otp-input')
    first?.focus()
  }
}

async function resend() {
  if (!canResend.value || !auth.pendingPhone) return
  await auth.requestOtp({
    phone: auth.pendingPhone,
    countryCode: '+20',
  })
  startCountdown()
}
</script>

<template>
  <div class="otp-page">
    <div class="container">
      <div class="otp-card card-glass">
        <h1 class="otp-title">{{ t('otp.title') }}</h1>
        <p class="otp-subtitle">{{ t('otp.subtitle', { phone: auth.pendingPhone }) }}</p>

        <div class="otp-inputs" dir="ltr" :class="{ shaking: isShaking }">
          <input
            v-for="(_, i) in digits"
            :key="i"
            :value="digits[i]"
            @input="handleInput(i, $event)"
            @keydown="handleKeydown(i, $event)"
            type="tel"
            maxlength="1"
            class="otp-input"
            :id="`otp-${i}`"
          />
        </div>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

        <button
          class="btn btn-primary verify-btn"
          :disabled="isLoading || digits.some(d => !d)"
          @click="verify"
          id="verify-btn"
        >
          <span v-if="isLoading" class="spinner"></span>
          <span v-else>{{ t('otp.verify') }}</span>
        </button>

        <div class="resend-section">
          <button
            v-if="canResend"
            class="btn btn-ghost"
            @click="resend"
            id="resend-btn"
          >
            {{ t('otp.resend') }}
          </button>
          <span v-else class="countdown">
            {{ t('otp.resendIn', { seconds: countdown }) }}
          </span>
        </div>

        <router-link :to="{ name: 'Home' }" class="change-number" id="change-number">
          {{ t('otp.changeNumber') }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.otp-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-4);
}

.otp-card {
  max-width: 420px;
  margin: 0 auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
}

.otp-title {
  font-size: var(--text-2xl);
  font-weight: 700;
}

.otp-subtitle {
  color: var(--color-text-muted);
}

.otp-inputs {
  display: flex;
  gap: var(--space-2);
  justify-content: center;
}

.otp-input {
  width: 48px;
  height: 56px;
  text-align: center;
  font-size: var(--text-2xl);
  font-weight: 700;
  background: var(--color-surface-2);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform 0.15s ease;
  font-family: var(--font-latin);
  will-change: transform, opacity;
}

.otp-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.15);
  transform: scale(1.05);
}

.otp-inputs.shaking .otp-input {
  border-color: #EF4444;
}

.verify-btn {
  width: 100%;
  padding: var(--space-4);
}

.resend-section {
  font-size: var(--text-sm);
}

.countdown {
  color: var(--color-text-muted);
}

.change-number {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.error-msg {
  color: #EF4444;
  font-size: var(--text-sm);
}

.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
