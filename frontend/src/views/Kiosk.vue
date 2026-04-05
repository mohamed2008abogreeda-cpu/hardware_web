<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { Keyboard, ScanLine } from 'lucide-vue-next'
import QRScanner from '@/components/QRScanner.vue'

const router = useRouter()
const code = ref('')
const mode = ref<'code' | 'scan'>('code')

let ctx: gsap.Context | null = null

function goToDevice() {
  const trimmed = code.value.trim()
  if (trimmed) {
    router.push({ name: 'DeviceDetails', params: { code: trimmed } })
  }
}

function onQRScanned(result: string) {
  const match = result.match(/\/device\/([^/?]+)/)
  const deviceCode = match ? match[1] : result.trim()
  if (deviceCode) {
    router.push({ name: 'DeviceDetails', params: { code: deviceCode } })
  }
}

onMounted(() => {
  ctx = gsap.context(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl.fromTo('.kiosk-card',
        { opacity: 0, y: 40, scale: 0.93 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.4)' })
      .fromTo('.kiosk-icon',
        { opacity: 0, scale: 0, rotation: -20 },
        { opacity: 1, scale: 1, rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' },
        '-=0.3')
      .fromTo('.kiosk-card h1',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4 },
        '-=0.2')
      .fromTo('.subtitle',
        { opacity: 0 },
        { opacity: 1, duration: 0.3 },
        '-=0.1')
      .fromTo('.mode-tabs',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4 },
        '-=0.1')
      .fromTo('.kiosk-form, .scanner-container',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4 },
        '-=0.1')
  })
})

onUnmounted(() => {
  ctx?.revert()
})
</script>

<template>
  <div class="kiosk-page">
    <div class="container">
      <div class="card kiosk-card">
        <div class="kiosk-icon">📱</div>
        <h1>إدخال كود الاستلام</h1>
        <p class="subtitle">ادخل كود الاستلام أو امسح QR Code للاطلاع على حالة جهازك</p>

        <!-- Mode Switcher -->
        <div class="mode-tabs">
          <button
            class="mode-tab"
            :class="{ active: mode === 'code' }"
            @click="mode = 'code'"
          >
            <Keyboard :size="18" />
            كتابة الكود
          </button>
          <button
            class="mode-tab"
            :class="{ active: mode === 'scan' }"
            @click="mode = 'scan'"
          >
            <ScanLine :size="18" />
            مسح QR
          </button>
        </div>

        <!-- Code Entry Mode -->
        <div v-if="mode === 'code'">
          <form @submit.prevent="goToDevice" class="kiosk-form">
            <input
              v-model="code"
              class="input code-input"
              placeholder="مثال: HW-2024-001"
              dir="ltr"
              id="kiosk-code-input"
            />
            <button type="submit" class="btn btn-primary" id="kiosk-submit" :disabled="!code.trim()">
              عرض الحالة
            </button>
          </form>
        </div>

        <!-- QR Scanner Mode -->
        <div v-else class="scanner-container">
          <QRScanner @scanned="onQRScanned" />
          <p class="scan-hint">وجّه الكاميرا نحو كود QR الموجود على إيصال الاستلام</p>
        </div>

        <!-- Back link -->
        <router-link :to="{ name: 'Home' }" class="back-to-home">
          ← العودة للصفحة الرئيسية
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kiosk-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
}

.kiosk-card {
  text-align: center;
  padding: var(--space-12);
  max-width: 520px;
  width: 100%;
}

.kiosk-icon {
  font-size: 3rem;
  margin-bottom: var(--space-4);
  display: inline-block;
}

.kiosk-card h1 {
  font-size: var(--text-2xl);
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.subtitle {
  color: var(--color-text-muted);
  margin-bottom: var(--space-6);
  line-height: 1.6;
}

/* Mode Tabs */
.mode-tabs {
  display: flex;
  gap: var(--space-2);
  background: var(--color-surface-2);
  border-radius: var(--radius-lg);
  padding: 4px;
  margin-bottom: var(--space-6);
}

.mode-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
}

.mode-tab.active {
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.kiosk-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.code-input {
  text-align: center;
  font-size: var(--text-xl);
  font-family: var(--font-latin);
  letter-spacing: 2px;
}

.scanner-container {
  margin-bottom: var(--space-4);
}

.scan-hint {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin-top: var(--space-3);
}

.back-to-home {
  display: inline-block;
  margin-top: var(--space-6);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-weight: 600;
  transition: color var(--transition-fast);
}
.back-to-home:hover {
  color: var(--color-primary);
}
</style>
