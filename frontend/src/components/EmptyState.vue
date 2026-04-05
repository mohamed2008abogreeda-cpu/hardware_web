<script setup lang="ts">
import type { Component } from 'vue'
import { onMounted, onUnmounted, ref } from 'vue'
import gsap from 'gsap'

defineProps<{
  icon: any
  title: string
  description?: string
}>()

const containerRef = ref<HTMLElement | null>(null)
let ctx: gsap.Context | null = null

onMounted(() => {
  ctx = gsap.context(() => {
    gsap.fromTo('.empty-icon-wrapper',
      { y: 30, opacity: 0, scale: 0.8 },
      { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.5)', delay: 0.1 }
    )
    gsap.fromTo('.empty-text-anim',
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out', delay: 0.3 }
    )
    
    // Floating continuous animation
    gsap.to('.empty-icon-wrapper', {
      y: -8,
      duration: 2,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: 0.9
    })
  }, containerRef.value || undefined)
})

onUnmounted(() => {
  ctx?.revert()
})
</script>

<template>
  <div class="empty-state" ref="containerRef">
    <div class="empty-bg-glow"></div>
    <div class="empty-icon-wrapper">
      <component :is="icon" :size="40" class="empty-icon" />
    </div>
    <h3 class="empty-title empty-text-anim">{{ title }}</h3>
    <p v-if="description" class="empty-desc empty-text-anim">{{ description }}</p>
    <div class="empty-action empty-text-anim">
      <slot name="action"></slot>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) var(--space-4);
  text-align: center;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  margin: var(--space-4) 0;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.empty-bg-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, color-mix(in srgb, var(--color-accent) 15%, transparent) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 0;
}

.empty-icon-wrapper, .empty-title, .empty-desc, .empty-action {
  position: relative;
  z-index: 1;
}

.empty-icon-wrapper {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: var(--color-surface);
  box-shadow: 0 10px 25px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-6);
  color: var(--color-primary);
  border: 4px solid var(--color-surface-2);
  will-change: transform, opacity;
}

.empty-title {
  font-size: var(--text-xl);
  font-weight: 800;
  color: var(--color-text);
  margin-bottom: var(--space-2);
  will-change: transform, opacity;
}

.empty-desc {
  font-size: var(--text-base);
  color: var(--color-text-muted);
  max-width: 450px;
  line-height: 1.6;
  margin-bottom: var(--space-6);
  will-change: transform, opacity;
}

.empty-action {
  will-change: transform, opacity;
}
</style>
