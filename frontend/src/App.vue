<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { onMounted, onUnmounted, computed, ref } from 'vue'
import { connectSocket } from '@/services/socket'
import { useAuthStore } from '@/stores/auth'
import { useDarkMode } from '@/composables/useDarkMode'
import { initLenis, destroyLenis, useLenis } from '@/composables/useLenis'
import { Smartphone, User } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import WelcomeSplash from '@/components/WelcomeSplash.vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const auth = useAuthStore()
const route = useRoute()
const { isDark } = useDarkMode()
const { t } = useI18n()
const { setupRouteScroll } = useLenis()

// Scroll progress
const scrollProgress = ref(0)

// Only show bottom nav for authenticated customers, not on Admin pages
const showCustomerNav = computed(() => {
  return auth.isLoggedIn && !route.path.startsWith('/admin')
})

// Show scroll progress bar only on customer pages
const showProgress = computed(() => !route.path.startsWith('/admin'))

onMounted(() => {
  // Connect socket if authenticated
  if (auth.isLoggedIn || auth.isAdminLoggedIn) {
    connectSocket()
  }

  // Initialize Lenis smooth scrolling
  const lenis = initLenis()

  // Track scroll progress for the progress bar
  if (lenis) {
    lenis.on('scroll', ({ progress }: { progress: number }) => {
      scrollProgress.value = progress
    })
  }

  // Setup route-based scroll resets
  setupRouteScroll()
})

onUnmounted(() => {
  destroyLenis()
})
</script>

<template>
  <WelcomeSplash v-if="!route.path.startsWith('/admin')" />

  <!-- Scroll Progress Bar -->
  <div v-if="showProgress" class="scroll-progress-track">
    <div class="scroll-progress-fill" :style="{ transform: `scaleX(${scrollProgress})` }"></div>
  </div>

  <div id="hw-app" class="grid-bg min-h-screen" :class="{ 'has-bottom-nav': showCustomerNav }">
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- Customer Bottom Navigation -->
    <nav v-if="showCustomerNav" class="customer-bottom-nav">
      <router-link :to="{ name: 'Track' }" class="nav-item" active-class="active">
        <Smartphone :size="24" />
        <span>{{ t('nav.track') }}</span>
      </router-link>
      <router-link :to="{ name: 'Profile' }" class="nav-item" active-class="active">
        <User :size="24" />
        <span>{{ t('nav.profile') }}</span>
      </router-link>
    </nav>
  </div>
</template>

<style scoped>
/* ── Scroll Progress Bar ── */
.scroll-progress-track {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 9999;
  background: transparent;
  pointer-events: none;
}

.scroll-progress-fill {
  height: 100%;
  width: 100%;
  background: var(--gradient-accent);
  transform-origin: left;
  will-change: transform;
  border-radius: 0 2px 2px 0;
  box-shadow: 0 0 10px rgba(197, 160, 89, 0.4);
}

#hw-app {
  position: relative;
  z-index: 1;
  padding-bottom: 0;
  transition: padding-bottom 0.3s ease;
}

#hw-app.has-bottom-nav {
  padding-bottom: 80px; /* Space for the bottom nav */
}

/* ── Customer Bottom Navigation ── */
.customer-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 65px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--glass-border);
  z-index: 50;
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.06);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.2s ease;
  flex: 1;
  padding: 8px 0;
}

.nav-item.active {
  color: var(--color-primary);
}

.nav-item.active > svg {
  transform: translateY(-2px);
  filter: drop-shadow(0 2px 4px rgba(var(--color-primary-rgb), 0.3));
}
</style>
