<script setup lang="ts">
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { onMounted, onUnmounted, ref } from 'vue'

const router = useRouter()
const el = ref<HTMLElement>()

let ctx: gsap.Context | null = null

onMounted(() => {
  ctx = gsap.context(() => {
    // ── Container entrance ──
    gsap.fromTo('.notfound-content',
      { opacity: 0, scale: 0.85, y: 30 },
      { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'back.out(1.5)' }
    )

    // ── 404 number dramatic entrance ──
    gsap.fromTo('.notfound-number',
      { opacity: 0, scale: 2, filter: 'blur(20px)' },
      { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.8, delay: 0.2, ease: 'power3.out' }
    )

    // ── Continuous floating animation ──
    gsap.to('.notfound-number', {
      y: -15,
      duration: 2.5,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: 1,
    })

    // ── Emoji bounce ──
    gsap.fromTo('.notfound-icon',
      { opacity: 0, rotation: -30, scale: 0 },
      { opacity: 1, rotation: 0, scale: 1, duration: 0.5, delay: 0.4, ease: 'elastic.out(1, 0.4)' }
    )

    // ── Button entrance ──
    gsap.fromTo('.notfound-content .btn',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, delay: 0.6 }
    )
  })
})

onUnmounted(() => {
  ctx?.revert()
})
</script>

<template>
  <div class="notfound-page">
    <div ref="el" class="notfound-content">
      <div class="notfound-icon">🔍</div>
      <h1 class="notfound-number">404</h1>
      <p>الصفحة اللي بتدوّر عليها مش موجودة</p>
      <button class="btn btn-primary" @click="router.push({ name: 'Home' })" id="go-home">
        ارجع للرئيسية
      </button>
    </div>
  </div>
</template>

<style scoped>
.notfound-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notfound-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.notfound-icon { font-size: 4rem; display: inline-block; }

.notfound-number {
  font-size: 7rem;
  font-weight: 900;
  color: var(--color-primary);
  font-family: var(--font-latin);
  letter-spacing: -4px;
  line-height: 1;
  will-change: transform, filter, opacity;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

p {
  color: var(--color-text-muted);
  font-size: var(--text-lg);
}
</style>
