<script setup lang="ts">
import { ref, computed } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { X, Printer } from 'lucide-vue-next'

const props = defineProps<{
  deviceCode: string
  deviceName: string
}>()

const emit = defineEmits(['close'])

const qrValue = computed(() => {
  // Use current origin to build the link
  return `${window.location.origin}/device/${props.deviceCode}`
})

function printQR() {
  const printContents = document.getElementById('qr-print-area')?.innerHTML
  if (!printContents) return

  const originalContents = document.body.innerHTML
  
  // Set custom style for printing
  const style = `
    <style>
      body { margin: 0; padding: 20px; font-family: sans-serif; text-align: center; }
      .print-wrapper { border: 2px solid #000; padding: 20px; display: inline-block; border-radius: 12px; }
      h2 { margin: 0 0 10px 0; font-size: 24px; }
      p { margin: 10px 0 0 0; font-size: 18px; font-weight: bold; }
    </style>
  `
  
  document.body.innerHTML = style + '<div class="print-wrapper">' + printContents + '</div>'
  window.print()
  document.body.innerHTML = originalContents
  window.location.reload() // Reload to restore Vue bindings
}
</script>

<template>
  <div class="qr-modal-overlay" @click.self="emit('close')">
    <div class="qr-modal-body card">
      <div class="modal-header">
        <h3>رمز الـ QR للجهاز</h3>
        <button class="icon-btn" @click="emit('close')">
          <X :size="20" />
        </button>
      </div>

      <div class="qr-display" id="qr-print-area">
        <h2>{{ deviceName }}</h2>
        <qrcode-vue :value="qrValue" :size="200" level="H" />
        <p>Code: {{ deviceCode }}</p>
      </div>

      <div class="modal-actions">
        <button class="btn btn-outline" @click="emit('close')">إغلاق</button>
        <button class="btn btn-primary btn-icon" @click="printQR">
          <Printer :size="18" /> طباعة الملصق
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qr-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-modal-body {
  width: 90%;
  max-width: 350px;
  background: var(--color-surface);
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  animation: scaleUp 0.3s ease-out;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--color-text);
}

.icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
}

.qr-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  color: #000; /* Force black text for print */
}

.qr-display h2 {
  margin: 0 0 var(--space-4) 0;
  font-size: 1.25rem;
  text-align: center;
}

.qr-display p {
  margin: var(--space-4) 0 0 0;
  font-family: monospace;
  font-size: 1.1rem;
  font-weight: bold;
}

.modal-actions {
  display: flex;
  justify-content: stretch;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.modal-actions .btn {
  flex: 1;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

@keyframes scaleUp {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
