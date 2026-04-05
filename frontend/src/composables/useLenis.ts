/**
 * useLenis — Central composable for Lenis smooth scroll + GSAP ScrollTrigger integration
 * Inspired by https://lenis.dev/
 */
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Singleton Lenis instance
let lenisInstance: Lenis | null = null
let rafId: number | null = null
let isInitialized = false

function raf(time: number) {
  lenisInstance?.raf(time)
  rafId = requestAnimationFrame(raf)
}

/**
 * Initialize the global Lenis instance (called once from App.vue)
 */
export function initLenis() {
  if (isInitialized) return lenisInstance

  lenisInstance = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    touchMultiplier: 2,
    infinite: false,
  })

  // Connect Lenis to GSAP's ScrollTrigger
  lenisInstance.on('scroll', ScrollTrigger.update)

  // Use GSAP ticker for frame-perfect scrolling
  gsap.ticker.add((time: number) => {
    lenisInstance?.raf(time * 1000)
  })
  gsap.ticker.lagSmoothing(0)

  isInitialized = true
  return lenisInstance
}

/**
 * Destroy Lenis on app unmount
 */
export function destroyLenis() {
  if (lenisInstance) {
    lenisInstance.destroy()
    lenisInstance = null
    isInitialized = false
  }
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

/**
 * Get the current Lenis instance
 */
export function getLenis(): Lenis | null {
  return lenisInstance
}

/**
 * useLenis composable — use in any component
 */
export function useLenis() {
  const lenis = ref<Lenis | null>(lenisInstance)

  function scrollTo(target: string | number | HTMLElement, options?: {
    offset?: number
    duration?: number
    immediate?: boolean
  }) {
    lenisInstance?.scrollTo(target, {
      offset: options?.offset ?? 0,
      duration: options?.duration ?? 1.2,
      immediate: options?.immediate ?? false,
    })
  }

  function stop() {
    lenisInstance?.stop()
  }

  function start() {
    lenisInstance?.start()
  }

  /**
   * Setup route-based scroll reset
   */
  function setupRouteScroll() {
    const router = useRouter()
    router.afterEach(async () => {
      await nextTick()
      // Reset scroll to top on navigation
      lenisInstance?.scrollTo(0, { immediate: true })
      // Refresh ScrollTrigger after route change
      setTimeout(() => {
        ScrollTrigger.refresh()
      }, 100)
    })
  }

  return {
    lenis,
    scrollTo,
    stop,
    start,
    setupRouteScroll,
    ScrollTrigger,
  }
}
