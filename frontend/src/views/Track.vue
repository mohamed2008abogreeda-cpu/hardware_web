<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useDevicesStore } from '@/stores/devices'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import EmptyState from '@/components/EmptyState.vue'
import { PackageOpen, Bell, ShieldCheck } from 'lucide-vue-next'
import { usePush } from '@/composables/usePush'

gsap.registerPlugin(ScrollTrigger)

const { t } = useI18n()
const devices = useDevicesStore()
const { isSupported, isSubscribed, subscribe, checkSubscription, isLoading: isPushLoading } = usePush()

let ctx: gsap.Context | null = null

onMounted(async () => {
  await devices.fetchMyDevices()
  devices.listenForUpdates()
  checkSubscription()

  ctx = gsap.context(() => {
    // Title entrance
    gsap.fromTo('.page-title',
      { opacity: 0, y: -20, filter: 'blur(8px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6, ease: 'power3.out' }
    )

    // Batch reveal: cards animate in groups as they enter viewport
    ScrollTrigger.batch('.device-card', {
      onEnter: (elements) => {
        gsap.fromTo(elements,
          { opacity: 0, y: 50, scale: 0.94 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            ease: 'back.out(1.3)',
            stagger: 0.1,
            overwrite: true,
          }
        )
      },
      start: 'top 88%',
      once: true,
    })
  })
})

onUnmounted(() => {
  ctx?.revert()
})
</script>

<template>
  <div class="track-page">
    <div class="container">
      <h1 class="page-title">{{ t('track.title') }}</h1>

      <!-- Push Notification Banner -->
      <div v-if="isSupported && !isSubscribed" class="push-banner glass-panel">
        <div class="push-content">
          <div class="push-icon"><Bell :size="20" /></div>
          <div class="push-text">
            <strong>{{ t('common.enableNotifications') || 'تفعيل التنبيهات' }}</strong>
            <p>{{ t('common.notificationHint') || 'ليصلك تحديثات حالة جهازك فوراً' }}</p>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" @click="subscribe" :disabled="isPushLoading">
          {{ isPushLoading ? t('common.loading') : t('common.enable') || 'تفعيل' }}
        </button>
      </div>

      <div v-else-if="isSubscribed" class="push-status-inline">
        <ShieldCheck :size="14" />
        <span>{{ t('common.notificationsEnabled') || 'التنبيهات مفعلة' }}</span>
      </div>

      <!-- Loading Skeletons -->
      <div v-if="devices.isLoading" class="cards-grid">
        <div v-for="i in 3" :key="i" class="glass-panel card skeleton-card">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width: 70%"></div>
          <div class="skeleton skeleton-badge"></div>
        </div>
      </div>

      <!-- Device Cards -->
      <div v-else-if="devices.devices.length" class="cards-grid">
        <router-link
          v-for="device in devices.devices"
          :key="device.rep_code"
          :to="{ name: 'DeviceDetails', params: { code: device.rep_code } }"
          class="device-card glass-panel card card-tilt"
        >
          <div class="card-header">
            <span class="device-code code">{{ device.rep_code }}</span>
            <span
              class="status-badge"
              :data-status="device.displayStatus"
            >
              {{ device.displayStatus }}
            </span>
          </div>
          <h3 class="device-name">{{ device.rep_name || device.rep_agent }}</h3>
          <p class="device-defects">{{ device.rep_defects }}</p>
          <div class="card-footer">
            <span class="date">{{ device.rep_date1 }}</span>
            <span v-if="device.rep_amount" class="amount number">
              {{ device.rep_amount }} {{ t('common.currency') }}
            </span>
          </div>
          <div v-if="device.displayStatus === 'تم التسليم'" class="card-extra-actions">
            <router-link
              :to="{ name: 'Rating', params: { deviceCode: device.rep_code } }"
              class="btn btn-accent btn-sm w-full"
              @click.stop
            >
              ⭐ تقييم الخدمة
            </router-link>
          </div>
        </router-link>
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else
        :icon="PackageOpen"
        :title="t('track.noDevices')"
        :description="t('track.noDevicesHint')"
      />
    </div>
  </div>
</template>

<style scoped>
.track-page {
  padding: var(--space-8) var(--space-4);
  min-height: 100vh;
}

.push-banner {
  max-width: 600px;
  margin: 0 auto var(--space-6);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  background: var(--color-surface-glass);
  border: 1px solid var(--color-primary);
}

.push-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.push-icon {
  width: 40px;
  height: 40px;
  background: var(--color-primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.push-text strong {
  display: block;
  font-size: 0.9rem;
}

.push-text p {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin: 0;
}

.push-status-inline {
  max-width: 600px;
  margin: 0 auto var(--space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #16a34a;
  font-size: 0.75rem;
  font-weight: 600;
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: 800;
  margin-bottom: var(--space-8);
  text-align: center;
  color: var(--color-primary);
  will-change: transform, opacity, filter;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-4);
  max-width: 1000px;
  margin: 0 auto;
}

.device-card {
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  will-change: transform, opacity;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.device-code {
  font-family: var(--font-latin);
  font-weight: 600;
  color: var(--color-primary);
  font-size: var(--text-sm);
}

.device-name {
  font-size: var(--text-lg);
  font-weight: 600;
  margin-bottom: var(--space-2);
}

.device-defects {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  margin-bottom: var(--space-4);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.amount {
  color: var(--color-accent);
  font-weight: 600;
}

.skeleton-card {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
