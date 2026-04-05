<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: number
  label?: string
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const hoverIndex = ref(-1)

const activeIndex = computed(() =>
  hoverIndex.value >= 0 ? hoverIndex.value : props.modelValue - 1
)

function select(index: number) {
  if (props.readonly) return
  emit('update:modelValue', index + 1)
}
</script>

<template>
  <div class="star-rating">
    <span v-if="label" class="rating-label">{{ label }}</span>
    <div class="stars">
      <button
        v-for="i in 5"
        :key="i"
        type="button"
        class="star"
        :class="{
          filled: i - 1 <= activeIndex,
          readonly: readonly,
        }"
        @click="select(i - 1)"
        @mouseenter="!readonly && (hoverIndex = i - 1)"
        @mouseleave="hoverIndex = -1"
        :disabled="readonly"
      >
        ★
      </button>
    </div>
  </div>
</template>

<style scoped>
.star-rating { display: flex; align-items: center; gap: var(--space-3); }
.rating-label { font-size: var(--text-sm); color: var(--color-text-muted); min-width: 80px; }

.stars { display: flex; gap: 4px; }

.star {
  background: none;
  border: none;
  font-size: 1.8rem;
  cursor: pointer;
  color: var(--color-border);
  transition: all 0.15s ease;
  padding: 0;
  line-height: 1;
}

.star.filled { color: #FBBF24; transform: scale(1.1); }
.star:not(.readonly):hover { transform: scale(1.3); }
.star.readonly { cursor: default; }
</style>
