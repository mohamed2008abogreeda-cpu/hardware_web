<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDevicesStore } from '@/stores/devices'
import { useRouter } from 'vue-router'
import { useDarkMode } from '@/composables/useDarkMode'
import { gsap } from 'gsap'
import { Phone, Smartphone, Sun, Moon, LogOut } from 'lucide-vue-next'

const auth = useAuthStore()
const devices = useDevicesStore()
const router = useRouter()
const { isDark, toggle: toggleTheme } = useDarkMode()

const showLogoutConfirm = ref(false)
let ctx: gsap.Context | null = null

// Get user initial for avatar
const userInitial = auth.phone ? auth.phone.slice(-2) : '👤'

// Animated counter refs
const animDevices = ref(0)
const animDelivered = ref(0)
const animActive = ref(0)

onMounted(async () => {
  await devices.fetchMyDevices()

  // Calculate stat targets
  const totalDevices = devices.devices.length
  const delivered = devices.devices.filter(d => d.displayStatus === 'تم التسليم').length
  const active = devices.devices.filter(d => d.displayStatus !== 'تم التسليم' && d.displayStatus !== 'لا تصلح').length

  ctx = gsap.context(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    // ── Avatar entrance ──
    tl.fromTo('.avatar-circle',
        { opacity: 0, scale: 0.5, rotation: -10 },
        { opacity: 1, scale: 1, rotation: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' })
      .fromTo('.profile-card h1',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4 },
        '-=0.3')

    // ── Stats counter animation ──
    tl.fromTo('.stats-row',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4 },
        '-=0.2')

    // Counter animations
    const counterObj = { d: 0, del: 0, act: 0 }
    gsap.to(counterObj, {
      d: totalDevices,
      del: delivered,
      act: active,
      duration: 1.2,
      ease: 'power2.out',
      delay: 0.4,
      onUpdate: () => {
        animDevices.value = Math.round(counterObj.d)
        animDelivered.value = Math.round(counterObj.del)
        animActive.value = Math.round(counterObj.act)
      }
    })

    // ── Info + Settings stagger ──
    tl.fromTo('.info-item',
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.3 },
        '-=0.1')
      .fromTo('.setting-item',
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.3 },
        '-=0.1')
      .fromTo('.actions .action-btn',
        { opacity: 0, y: 15, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, stagger: 0.08, ease: 'back.out(1.3)' },
        '-=0.1')
  })
})

onUnmounted(() => {
  ctx?.revert()
})

function logout() {
  auth.logout()
  router.push({ name: 'Home' })
}
</script>

<template>
  <div class="profile-page">
    <div class="container">
      <div class="card profile-card">
        <!-- Avatar -->
        <div class="avatar-section">
          <div class="avatar-circle">
            <span>{{ userInitial }}</span>
          </div>
          <h1>حسابي</h1>
        </div>

        <!-- Stats Row -->
        <div class="stats-row">
          <div class="stat-item">
            <span class="stat-num number counter-num">{{ animDevices }}</span>
            <span class="stat-label">أجهزة</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-num number counter-num">{{ animDelivered }}</span>
            <span class="stat-label">تم تسليمها</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-num number counter-num">{{ animActive }}</span>
            <span class="stat-label">قيد العمل</span>
          </div>
        </div>

        <!-- Info Section -->
        <div class="info-section">
          <div class="info-item">
            <div class="info-icon">
              <Phone :size="18" />
            </div>
            <div class="info-content">
              <span class="info-label">رقم الهاتف</span>
              <span class="info-value" dir="ltr">{{ auth.phone || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Settings -->
        <div class="settings-section">
          <button class="setting-item" @click="toggleTheme" id="theme-toggle">
            <div class="setting-icon">
              <Sun v-if="!isDark" :size="18" />
              <Moon v-else :size="18" />
            </div>
            <span class="setting-label">{{ isDark ? 'الوضع الليلي' : 'الوضع النهاري' }}</span>
            <div class="toggle-switch" :class="{ active: isDark }">
              <span class="toggle-knob"></span>
            </div>
          </button>
        </div>

        <!-- Actions -->
        <div class="actions">
          <router-link :to="{ name: 'Track' }" class="btn btn-primary action-btn">
            <Smartphone :size="18" />
            أجهزتك اللي عندنا
          </router-link>

          <button
            class="btn btn-outline action-btn"
            @click="showLogoutConfirm = true"
            id="logout-btn"
          >
            <LogOut :size="18" />
            خروج
          </button>
        </div>

        <!-- Logout Confirmation -->
        <Teleport to="body">
          <transition name="fade">
            <div v-if="showLogoutConfirm" class="confirm-overlay" @click.self="showLogoutConfirm = false">
              <div class="confirm-dialog card">
                <div class="confirm-icon">🚪</div>
                <p>متأكد إنك عايز تخرج؟</p>
                <div class="confirm-buttons">
                  <button class="btn btn-danger" @click="logout">أيوة، اخرج</button>
                  <button class="btn btn-outline" @click="showLogoutConfirm = false">لأ، خليك</button>
                </div>
              </div>
            </div>
          </transition>
        </Teleport>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
}

.profile-card {
  text-align: center;
  padding: var(--space-8);
  max-width: 440px;
  width: 100%;
  position: relative;
}

/* Avatar */
.avatar-section {
  margin-bottom: var(--space-6);
}

.avatar-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--gradient-primary);
  color: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  font-weight: 800;
  margin: 0 auto var(--space-4);
  font-family: var(--font-latin);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.2);
  will-change: transform, opacity;
}

.profile-card h1 {
  font-size: var(--text-2xl);
  font-weight: 700;
}

/* Stats */
.stats-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-6);
  padding: var(--space-4) 0;
  margin-bottom: var(--space-6);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}

.stat-num {
  font-size: var(--text-2xl);
  font-weight: 800;
  color: var(--color-primary);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-weight: 600;
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: var(--color-border);
}

/* Info */
.info-section {
  margin-bottom: var(--space-4);
}

.info-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-2);
  border-radius: var(--radius-lg);
}

.info-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: right;
}

.info-label { font-size: var(--text-xs); color: var(--color-text-muted); }
.info-value { font-family: var(--font-latin); font-weight: 600; font-size: var(--text-sm); }

/* Settings */
.settings-section {
  margin-bottom: var(--space-6);
}

.setting-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-2);
  border-radius: var(--radius-lg);
  border: none;
  cursor: pointer;
  font-family: inherit;
  color: var(--color-text);
  transition: background var(--transition-fast);
}

.setting-item:hover {
  background: color-mix(in srgb, var(--color-surface-2) 80%, var(--color-primary));
}

.setting-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.setting-label { flex: 1; text-align: right; font-size: var(--text-sm); font-weight: 600; }

.toggle-switch {
  width: 44px; height: 24px; border-radius: 12px;
  background: var(--color-border); 
  position: relative; transition: background var(--transition-fast);
}
.toggle-switch.active { background: var(--color-primary); }
.toggle-knob {
  width: 18px; height: 18px; border-radius: 50%; background: white;
  position: absolute; top: 3px; left: 3px;
  transition: transform var(--transition-fast);
  box-shadow: var(--shadow-sm);
}
.toggle-switch.active .toggle-knob { transform: translateX(20px); }

/* Actions */
.actions { display: flex; flex-direction: column; gap: var(--space-3); }
.action-btn { width: 100%; }
.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}
.btn-outline:hover {
  border-color: var(--color-primary);
}

.btn-danger {
  background: #EF4444;
  color: white;
  border: none;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
}

/* Confirm Dialog */
.confirm-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center; justify-content: center; z-index: 100;
}
.confirm-dialog {
  padding: var(--space-8); text-align: center; max-width: 340px;
}
.confirm-icon { font-size: 2.5rem; margin-bottom: var(--space-4); }
.confirm-dialog p { margin-bottom: var(--space-6); font-size: var(--text-lg); font-weight: 600; }
.confirm-buttons { display: flex; gap: var(--space-3); justify-content: center; }

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
