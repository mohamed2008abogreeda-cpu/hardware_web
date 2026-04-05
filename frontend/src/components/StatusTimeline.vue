<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'

const props = defineProps<{
  currentStatus: string
}>()

const steps = [
  { key: 'قيد الفحص', label: 'جاري الفحص المبدئي', icon: '🔍' },
  { key: 'قيد الإصلاح', label: 'الجهاز قيد الإصلاح', icon: '🔧' },
  { key: 'جاهز للاستلام', label: 'جاهز للاستلام والتسليم', icon: '✅' },
  { key: 'تم التسليم', label: 'تم تسليم الجهاز للعميل', icon: '📦' },
]

// Branching statuses (shown as off-track from main flow)
const branchStatuses = ['انتظار موافقة', 'لا تصلح', 'إعاده توجيه']

const currentIndex = computed(() => {
  const idx = steps.findIndex(s => s.key === props.currentStatus)
  if (idx === -1) {
    if (branchStatuses.includes(props.currentStatus)) return 1.5
    return 0
  }
  return idx
})

const isBranch = computed(() => branchStatuses.includes(props.currentStatus))

const branchIcon = computed(() => {
  const map: Record<string, string> = {
    'انتظار موافقة': '⏳',
    'لا تصلح': '❌',
    'إعاده توجيه': '↩️',
  }
  return map[props.currentStatus] || '⚠️'
})

const branchStyle = computed(() => {
  if (props.currentStatus === 'لا تصلح') return 'rejected'
  if (props.currentStatus === 'إعاده توجيه') return 'delivery'
  return 'approval'
})

const progressHeight = computed(() => {
  const ratio = Math.min(Math.floor(currentIndex.value), steps.length - 1) / (steps.length - 1)
  return `${ratio * 100}%`
})

let ctx: gsap.Context | null = null

onMounted(() => {
  ctx = gsap.context(() => {
    // ── Animate step dots ──
    gsap.fromTo('.step-dot',
      { opacity: 0, scale: 0, rotation: -45 },
      { opacity: 1, scale: 1, rotation: 0, duration: 0.6, stagger: 0.15, ease: 'back.out(2)', delay: 0.1 }
    )

    // ── Animate text ──
    gsap.fromTo('.step-content',
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.6, stagger: 0.15, ease: 'power2.out', delay: 0.3 }
    )

    // ── Animate progress bar fill ──
    gsap.fromTo('.progress-fill',
      { height: '0%' },
      { height: progressHeight.value, duration: 1.5, ease: 'power3.inOut', delay: 0.5 }
    )

    // ── Current step active pulse ──
    gsap.to('.timeline-step.current .step-dot', {
      boxShadow: '0 0 25px color-mix(in srgb, var(--color-accent) 60%, transparent)',
      borderColor: 'var(--color-accent)',
      duration: 1.2,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: 1.5,
    })

    if (isBranch.value) {
      gsap.fromTo('.branch-status',
        { opacity: 0, x: 30, scale: 0.9 },
        { opacity: 1, x: 0, scale: 1, duration: 0.6, delay: 1, ease: 'back.out(1.5)' }
      )
    }
  })
})

onUnmounted(() => {
  ctx?.revert()
})
</script>

<template>
  <div class="vertical-timeline">
    <div class="progress-bar-container">
      <div class="progress-bar-bg"></div>
      <div class="progress-fill"></div>
    </div>

    <div class="steps-container">
      <div
        v-for="(step, i) in steps"
        :key="step.key"
        class="timeline-step"
        :class="{
          completed: i < Math.floor(currentIndex),
          current: step.key === currentStatus,
          upcoming: i > currentIndex
        }"
      >
        <div class="step-indicator">
          <div class="step-dot">
            <span class="step-icon">{{ step.icon }}</span>
          </div>
        </div>
        <div class="step-content">
          <h4 class="step-title">{{ step.key }}</h4>
          <p class="step-desc">{{ step.label }}</p>
        </div>
      </div>
    </div>

    <!-- Branch Status (if applicable) -->
    <div v-if="isBranch" class="branch-status" :class="branchStyle">
      <div class="branch-badge">
        <span class="branch-icon">{{ branchIcon }}</span>
        <div class="branch-text">
          <h4>حالة استثنائية</h4>
          <p>{{ currentStatus }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vertical-timeline {
  display: flex;
  flex-direction: column;
  position: relative;
  padding: var(--space-4) 0;
  min-height: 350px;
}

/* Background tracks */
.progress-bar-container {
  position: absolute;
  top: 36px;
  bottom: 60px;
  right: 21px; /* Align with center of 44px dot */
  width: 4px;
  z-index: 0;
  border-radius: 2px;
}

.progress-bar-bg {
  position: absolute;
  inset: 0;
  background: var(--color-border);
  opacity: 0.5;
  border-radius: inherit;
}

.progress-fill {
  position: absolute;
  top: 0; right: 0; left: 0;
  background: var(--gradient-accent);
  border-radius: inherit;
  z-index: 1;
  box-shadow: 0 0 10px var(--color-accent);
}

.steps-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  position: relative;
  z-index: 2;
}

.timeline-step {
  display: flex;
  position: relative;
  gap: var(--space-4);
  align-items: center;
}

/* Step Indicator */
.step-indicator {
  position: relative;
}

.step-dot {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.timeline-step.completed .step-dot {
  background: color-mix(in srgb, var(--status-ready) 15%, var(--color-surface));
  border-color: var(--status-ready);
  color: var(--status-ready);
}

.timeline-step.current .step-dot {
  background: color-mix(in srgb, var(--color-accent) 15%, var(--color-surface));
  border-color: var(--color-accent);
  transform: scale(1.1);
}

.timeline-step.upcoming .step-dot {
  opacity: 0.5;
  background: var(--color-surface-2);
  filter: grayscale(1);
}

/* Step Content */
.step-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.step-title {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 2px;
  transition: color var(--transition-normal);
}

.step-desc {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.timeline-step.current .step-title {
  color: var(--color-accent);
  text-shadow: 0 0 10px color-mix(in srgb, var(--color-accent) 20%, transparent);
}

.timeline-step.completed .step-title {
  color: var(--status-ready);
}

/* Branch status */
.branch-status {
  margin-top: var(--space-6);
  padding-right: 60px; /* offset to align nicely */
}

.branch-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

.branch-icon {
  font-size: 1.5rem;
}

.branch-text h4 {
  font-size: var(--text-sm);
  font-weight: 700;
}
.branch-text p {
  font-size: var(--text-xs);
  opacity: 0.8;
}

.branch-status.approval .branch-badge { border-color: var(--status-approval); color: var(--status-approval); background: color-mix(in srgb, var(--status-approval) 10%, var(--color-surface)); }
.branch-status.rejected .branch-badge { border-color: var(--status-rejected); color: var(--status-rejected); background: color-mix(in srgb, var(--status-rejected) 10%, var(--color-surface)); }
.branch-status.delivery .branch-badge { border-color: var(--status-delivered); color: var(--status-delivered); background: color-mix(in srgb, var(--status-delivered) 10%, var(--color-surface)); }
</style>
