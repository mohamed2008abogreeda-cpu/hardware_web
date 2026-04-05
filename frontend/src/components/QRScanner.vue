<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'
import { X } from 'lucide-vue-next'

const emit = defineEmits(['close', 'scan'])

const html5QrCode = ref<Html5Qrcode | null>(null)
const errorMsg = ref('')

onMounted(async () => {
  html5QrCode.value = new Html5Qrcode("qr-reader")
  try {
    await html5QrCode.value.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      (decodedText) => {
        // Success
        stopScanner()
        emit('scan', decodedText)
      },
      (errorMessage) => {
        // parse error, ignore.
      }
    )
  } catch (err) {
    errorMsg.value = 'تعذر فتح الكاميرا، يرجى التأكد من الصلاحيات.'
    console.error(err)
  }
})

function stopScanner() {
  if (html5QrCode.value && html5QrCode.value.isScanning) {
    html5QrCode.value.stop().catch(console.error)
  }
}

onUnmounted(() => {
  stopScanner()
})
</script>

<template>
  <div class="qr-scanner-overlay" @click.self="emit('close')">
    <div class="qr-scanner-card card">
      <div class="header">
        <h3>امسح كود الجهاز</h3>
        <button class="icon-btn" @click="emit('close')">
          <X :size="20" />
        </button>
      </div>

      <div class="reader-container">
        <div id="qr-reader"></div>
        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      </div>
      
      <p class="hint">قم بتوجيه الكاميرا نحو ملصق الـ QR الموجود على الجهاز</p>
    </div>
  </div>
</template>

<style scoped>
.qr-scanner-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-scanner-card {
  width: 90%;
  max-width: 400px;
  background: var(--color-surface);
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header h3 { margin: 0; font-size: 1.1rem; }
.icon-btn { background: transparent; border: none; cursor: pointer; color: var(--color-text-muted); }

.reader-container {
  width: 100%;
  border-radius: var(--radius-lg);
  overflow: hidden;
  position: relative;
  min-height: 250px;
  background: #000;
}

.error {
  color: #EF4444;
  text-align: center;
  padding: var(--space-4);
  font-weight: bold;
}

.hint {
  text-align: center;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  margin: 0;
}
</style>
