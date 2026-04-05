<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'

const show = ref(true)

onMounted(() => {
  // ── Splash entrance sequence ──
  const tl = gsap.timeline()

  tl.fromTo('.splash-logo-box',
      { opacity: 0, scale: 0.5, rotation: -15 },
      { opacity: 1, scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2)' })
    .fromTo('.splash-title',
      { opacity: 0, y: 20, filter: 'blur(8px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.4 },
      '-=0.2')
    .fromTo('.splash-text',
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3 },
      '-=0.1')

  // Dismiss after animation
  setTimeout(() => {
    gsap.to('.splash-screen', {
      opacity: 0,
      scale: 1.05,
      filter: 'blur(8px)',
      duration: 0.5,
      ease: 'power2.in',
      onComplete: () => { show.value = false }
    })
  }, 1400)
})
</script>

<template>
  <div v-if="show" class="splash-screen">
    <!-- Gradient backdrop -->
    <div class="splash-gradient"></div>

    <div class="splash-content">
      <div class="splash-logo-box">
        <img src="/logo.png" alt="هارد وير" class="splash-logo" />
      </div>
      <h1 class="splash-title">هارد وير</h1>
      <div class="splash-loader"><div class="splash-loader-fill"></div></div>
      <p class="splash-text">يا مرحباً يا كبير.. ثواني بنجهزلك كل حاجة 👋</p>
    </div>
  </div>
</template>

<style scoped>
.splash-screen {
  position: fixed;
  inset: 0;
  background: var(--color-bg, #0A0F1E);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: opacity, transform, filter;
}

.splash-gradient {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(circle at 30% 40%, rgba(197, 160, 89, 0.08), transparent 50%),
    radial-gradient(circle at 70% 60%, rgba(168, 44, 106, 0.06), transparent 50%);
  animation: splashGradientShift 3s ease-in-out infinite alternate;
}

@keyframes splashGradientShift {
  0% { opacity: 0.5; }
  100% { opacity: 1; }
}

.splash-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.splash-logo-box {
  width: 100px;
  height: 100px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.05);
  will-change: transform, opacity;
}

.splash-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.splash-title {
  font-size: 32px;
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: -0.5px;
  font-family: var(--font-arabic);
}

.splash-brand-4 {
  color: var(--color-magenta, #A82C6A);
  font-family: var(--font-latin);
  font-weight: 900;
}

.splash-text {
  color: var(--color-text-muted);
  font-size: 15px;
  font-weight: 600;
  margin-top: 10px;
}

.splash-loader {
  width: 60px;
  height: 4px;
  background: var(--color-surface-2);
  border-radius: 2px;
  margin-top: 10px;
  position: relative;
  overflow: hidden;
}

.splash-loader-fill {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 40%;
  background: var(--gradient-accent);
  border-radius: 2px;
  animation: splashLoad 1.2s ease-in-out infinite;
}

@keyframes splashLoad {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(300%); }
}
</style>
