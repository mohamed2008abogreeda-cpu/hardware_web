<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useDevicesStore } from '@/stores/devices'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import { connectSocket, joinDeviceRoom } from '@/services/socket'
import StatusTimeline from '@/components/StatusTimeline.vue'
import api from '@/services/api'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const props = defineProps<{ code: string }>()
const { t } = useI18n()
const devices = useDevicesStore()
const auth = useAuthStore()
const isSharing = ref(false)
const shareUrl = ref('')
const isOnMyWay = ref(false)

let ctx: gsap.Context | null = null

// Show advanced features only for authenticated users
const isLoggedIn = computed(() => auth.isAuthenticated)

onMounted(async () => {
  await devices.fetchDevice(props.code)

  ctx = gsap.context(() => {
    // ── Staggered entrance for detail sections ──
    const tl = gsap.timeline({
      defaults: { ease: 'power3.out', duration: 0.5 }
    })

    tl.fromTo('.back-link',
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.3 })
      .fromTo('.detail-card',
        { opacity: 0, y: 40, filter: 'blur(8px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6 },
        '-=0.1')
      .fromTo('.detail-header > *',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, stagger: 0.1 },
        '-=0.3')
      .fromTo('.device-name',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0 },
        '-=0.2')

    // ── Scroll-triggered sections ──
    gsap.fromTo('.detail-grid .detail-item',
      { opacity: 0, y: 25 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.detail-grid',
          start: 'top 85%',
          toggleActions: 'play none none none',
        }
      }
    )

    // ── Action buttons bounce entrance ──
    gsap.fromTo('.action-buttons .btn',
      { opacity: 0, y: 20, scale: 0.9 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.4,
        stagger: 0.08,
        ease: 'back.out(1.5)',
        scrollTrigger: {
          trigger: '.action-buttons',
          start: 'top 90%',
          toggleActions: 'play none none none',
        }
      }
    )
  })

  // Socket — only if authenticated
  if (isLoggedIn.value) {
    try {
      connectSocket()
      joinDeviceRoom(props.code)

      const socket = connectSocket()
      socket.on('server:device:statusChanged', (data: { deviceCode: string; newStatus: string }) => {
        if (data.deviceCode === props.code) {
          devices.updateDeviceStatus(data.deviceCode, data.newStatus)
        }
      })
    } catch { /* socket not available */ }
  }
})

onUnmounted(() => {
  ctx?.revert()
})

async function shareDevice() {
  isSharing.value = true
  try {
    const res = await api.post(`/api/devices/${props.code}/share`)
    if (res.data.success) {
      shareUrl.value = `${window.location.origin}/share/${res.data.data.token}`
      navigator.clipboard?.writeText(shareUrl.value)
    }
  } catch { /* empty */ } finally {
    isSharing.value = false
  }
}

async function notifyOnMyWay() {
  isOnMyWay.value = true
  try {
    await api.post(`/api/devices/${props.code}/ontheway`)
  } catch { /* empty */ }
}
</script>

<template>
  <div class="device-details-page">
    <div class="container">
      <router-link :to="isLoggedIn ? { name: 'Track' } : { name: 'Kiosk' }" class="back-link">
        ← {{ t('common.back') }}
      </router-link>

      <div v-if="devices.isLoading" class="card skeleton-card">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text" style="width: 60%"></div>
      </div>

      <div v-else-if="devices.currentDevice" class="detail-content">
        <div class="glass-panel detail-card">
          <div class="detail-header">
            <span class="device-code code">{{ devices.currentDevice.rep_code }}</span>
            <span class="status-badge" :data-status="devices.currentDevice.displayStatus">
              {{ devices.currentDevice.displayStatus }}
            </span>
          </div>

          <h1 class="device-name"><span class="greeting">أهلاً يا</span> {{ devices.currentDevice.rep_name || devices.currentDevice.rep_agent }}</h1>

          <!-- Status Timeline -->
          <StatusTimeline :current-status="devices.currentDevice.displayStatus" />

          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">{{ t('device.defects') }}</span>
              <span class="detail-value">{{ devices.currentDevice.rep_defects }}</span>
            </div>
            <div v-if="devices.currentDevice.rep_solution" class="detail-item">
              <span class="detail-label">{{ t('device.solution') }}</span>
              <span class="detail-value">{{ devices.currentDevice.rep_solution }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">{{ t('device.receivedAt') }}</span>
              <span class="detail-value date">{{ devices.currentDevice.rep_date1 }}</span>
            </div>
            <div v-if="devices.currentDevice.rep_amount" class="detail-item">
              <span class="detail-label">{{ t('device.amount') }}</span>
              <span class="detail-value number amount">{{ devices.currentDevice.rep_amount }} {{ t('common.currency') }}</span>
            </div>
          </div>

          <!-- Action Buttons — authenticated users only -->
          <div v-if="isLoggedIn" class="action-buttons">
            <router-link
              :to="{ name: 'CustomerChat', params: { code: props.code } }"
              class="btn btn-primary"
              id="chat-btn"
            >
              💬 الدعم الفني
            </router-link>

            <button
              class="btn btn-primary"
              :disabled="isSharing"
              @click="shareDevice"
              id="share-btn"
            >
              {{ isSharing ? '...' : t('device.share') }}
            </button>

            <button
              v-if="devices.currentDevice.displayStatus === 'جاهز للاستلام'"
              class="btn btn-accent"
              :disabled="isOnMyWay"
              @click="notifyOnMyWay"
              id="onmyway-btn"
            >
              {{ isOnMyWay ? '✓ تم الإبلاغ' : t('device.onMyWay') }}
            </button>

            <router-link
              v-if="devices.currentDevice.displayStatus === 'تم التسليم'"
              :to="{ name: 'Rating', params: { deviceCode: props.code } }"
              class="btn btn-accent"
              id="rate-btn"
            >
              قيّم الخدمة ⭐
            </router-link>
          </div>

          <!-- Kiosk user — prompt to login for more features -->
          <div v-else class="login-prompt glass-panel">
            <p>💡 <router-link :to="{ name: 'Home' }">سجّل دخولك</router-link> لاستخدام المحادثة والمشاركة والتقييم</p>
          </div>

          <!-- Share URL display -->
          <div v-if="shareUrl" class="share-url glass-panel">
            <span class="share-label">رابط المشاركة (تم النسخ):</span>
            <code dir="ltr">{{ shareUrl }}</code>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <p>{{ devices.error || t('track.notFound') }}</p>
        <router-link :to="{ name: 'Kiosk' }" class="btn btn-primary" style="margin-top:16px">
          ← ارجع وأدخل الكود مرة ثانية
        </router-link>
      </div>

    </div>
  </div>
</template>

<style scoped>
.device-details-page {
  padding: var(--space-8) var(--space-4);
  min-height: 100vh;
}

.back-link {
  display: inline-block;
  margin-bottom: var(--space-6);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  transition: color var(--transition-fast);
}
.back-link:hover { color: var(--color-primary); }

.detail-card {
  max-width: 680px;
  margin: 0 auto;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.device-code {
  font-family: var(--font-latin);
  font-weight: 600;
  color: var(--color-primary);
}

.device-name {
  font-size: var(--text-2xl);
  font-weight: 800;
  margin-bottom: var(--space-6);
  color: var(--color-primary);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.greeting {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  font-weight: 600;
}

.detail-grid {
  display: grid;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  will-change: transform, opacity;
}

.detail-label {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  font-weight: 600;
}

.detail-value { font-size: var(--text-base); }

.amount {
  color: var(--color-accent);
  font-weight: 700;
  font-size: var(--text-lg);
}

.action-buttons {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}

.login-prompt {
  padding: var(--space-3) var(--space-4);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin-bottom: var(--space-4);
}
.login-prompt a { color: var(--color-primary); font-weight: 600; }

.share-url {
  margin-top: var(--space-4);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.share-label { color: var(--color-text-muted); }
.share-url code {
  color: var(--color-primary);
  word-break: break-all;
  font-family: var(--font-latin);
}

.skeleton-card {
  max-width: 680px;
  margin: 0 auto;
  padding: var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.empty-state {
  text-align: center;
  padding: var(--space-16);
  color: var(--color-text-muted);
}
</style>
