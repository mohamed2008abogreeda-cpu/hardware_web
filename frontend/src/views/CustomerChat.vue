<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'
import { useSocket } from '@/composables/useSocket'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { Paperclip, X, FileText, Download, Mic, Square, Trash2 } from 'lucide-vue-next'
import { useVoiceRecorder } from '@/composables/useVoiceRecorder'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const deviceCode = computed(() => route.params.code as string)

interface Message {
  id: number
  sender_type: 'customer' | 'support'
  message: string
  timestamp: string
  file_url?: string
  file_type?: string
  file_size?: number
}

const messages = ref<Message[]>([])
const newMsg = ref('')
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isLoading = ref(false)
const isSending = ref(false)
const supportTyping = ref(false)
const container = ref<HTMLElement | null>(null)
const { isRecording, recordingTime, audioBlob, startRecording, stopRecording, cancelRecording, formatTime: formatRecordingTime } = useVoiceRecorder()

const { socket, emitTyping } = useSocket(deviceCode.value)

socket.on('server:chat:message', (msg: Message) => {
  messages.value.push(msg)
  nextTick(() => {
    scrollBottom()
    animateLastMessage()
  })
})

socket.on('server:chat:typing', () => {
  supportTyping.value = true
  setTimeout(() => { supportTyping.value = false }, 3000)
})

socket.on('server:chat:stopTyping', () => {
  supportTyping.value = false
})

onMounted(async () => {
  // ── Header entrance ──
  gsap.fromTo('.chat-header',
    { opacity: 0, y: -20 },
    { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }
  )

  await loadMessages()
  scrollBottom()

  // ── Animate existing messages ──
  gsap.fromTo('.msg',
    { opacity: 0, y: 20, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 0.3, stagger: 0.04, ease: 'power2.out' }
  )
})

function animateLastMessage() {
  const allMsgs = document.querySelectorAll('.msg')
  const lastMsg = allMsgs[allMsgs.length - 1]
  if (lastMsg) {
    gsap.fromTo(lastMsg,
      { opacity: 0, y: 20, scale: 0.92 },
      { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.3)' }
    )
  }
}

async function loadMessages() {
  isLoading.value = true
  try {
    const res = await api.get(`/api/chat/${deviceCode.value}/messages`)
    if (res.data.success) messages.value = res.data.data
  } catch { /* empty */ } finally {
    isLoading.value = false
    nextTick(() => scrollBottom())
  }
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
  }
}

function removeFile() {
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}

async function sendMessage() {
  if ((!newMsg.value.trim() && !selectedFile.value && !audioBlob.value) || isSending.value) return
  isSending.value = true

  const formData = new FormData()
  if (newMsg.value.trim()) formData.append('message', newMsg.value.trim())
  if (selectedFile.value) formData.append('file', selectedFile.value)
  if (audioBlob.value) {
    formData.append('file', audioBlob.value, 'voice-record.webm')
  }

  // ── Send button pulse ──
  gsap.fromTo('.chat-input button[type="submit"]',
    { scale: 1 },
    { scale: 0.9, duration: 0.1, yoyo: true, repeat: 1 }
  )

  try {
    const res = await api.post(`/api/chat/${deviceCode.value}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    if (res.data.success) {
      messages.value.push(res.data.data)
      newMsg.value = ''
      selectedFile.value = null
      audioBlob.value = null
      if (fileInput.value) fileInput.value.value = ''
      await nextTick()
      scrollBottom()
      animateLastMessage()
    }
  } catch (err: any) {
    const errorMsg = err.response?.data?.error || 'حدث خطأ أثناء الإرسال، يرجى المحاولة مرة أخرى.';
    alert(errorMsg);
  } finally {
    isSending.value = false
    document.getElementById('chat-input-field')?.focus()
  }
}

async function handleToggleRecording() {
  if (isRecording.value) {
    stopRecording()
  } else {
    try {
      await startRecording()
    } catch {
      alert('تعذر الوصول للميكروفون، يرجى التأكد من منحه الصلاحية')
    }
  }
}

function scrollBottom() {
  if (container.value) {
    container.value.scrollTop = container.value.scrollHeight
  }
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}

const openFile = (url: string) => window.open(url, '_blank')
const getPreviewUrl = (file: File) => URL.createObjectURL(file)

function onInput() {
  emitTyping()
}

function goBack() {
  router.push({ name: 'DeviceDetails', params: { code: deviceCode.value } })
}
</script>

<template>
  <div class="chat-page">
    <div class="chat-header">
      <button @click="goBack" class="back-btn">← رجوع</button>
      <div class="title-area">
        <span class="chat-title">الدعم الفني</span>
        <span class="chat-code code">#{{ deviceCode }}</span>
      </div>
    </div>

    <div class="chat-messages" ref="container">
      <div v-if="isLoading" class="chat-loading">
        <div class="spinner-small"></div>
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
        class="msg"
        :class="msg.sender_type"
      >
        <!-- File Attachment -->
        <div v-if="msg.file_url" class="msg-file">
          <template v-if="msg.file_type?.startsWith('image/')">
            <img :src="msg.file_url" class="msg-img" @click="openFile(msg.file_url)" />
          </template>
          <template v-else-if="msg.file_type?.startsWith('audio/')">
             <audio controls :src="msg.file_url" class="msg-audio"></audio>
          </template>
          <template v-else>
            <div class="file-link" @click="openFile(msg.file_url)">
              <FileText :size="20" />
              <div class="file-info">
                <span class="file-name">مرفق ملف</span>
                <span class="file-meta">{{ (msg.file_size! / 1024).toFixed(1) }} KB</span>
              </div>
              <Download :size="16" class="dl-icon" />
            </div>
          </template>
        </div>

        <p v-if="msg.message">{{ msg.message }}</p>
        <span class="msg-ts">{{ formatTime(msg.timestamp) }}</span>
      </div>

      <div v-if="supportTyping" class="typing-indicator">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
      
      <div v-if="messages.length === 0 && !isLoading" class="empty-chat">
        <span style="font-size: 2rem">💬</span>
        <p>ابدأ المحادثة مع الدعم الفني، اكتب رسالتك وسنرد في أقرب وقت.</p>
      </div>
    </div>

    <div v-if="selectedFile || audioBlob" class="file-preview-strip">
      <div v-if="selectedFile" class="preview-item">
        <FileText v-if="!selectedFile.type.startsWith('image/')" :size="20" />
        <img v-else :src="getPreviewUrl(selectedFile)" class="thumb" />
        <span class="name">{{ selectedFile.name }}</span>
        <button class="remove-file" @click="removeFile"><X :size="14" /></button>
      </div>
      
      <div v-if="audioBlob" class="preview-item audio-preview">
        <Mic :size="20" class="mic-icon" />
        <span class="name">تسجيل صوتي</span>
        <button class="remove-file" @click="audioBlob = null"><X :size="14" /></button>
      </div>
    </div>

    <form class="chat-input" @submit.prevent="sendMessage">
      <input
        type="file"
        ref="fileInput"
        style="display: none"
        accept="image/*,.pdf"
        @change="handleFileSelect"
      />
      
      <div v-if="isRecording" class="recording-overlay">
        <div class="recording-dots">
          <span class="recording-dot"></span>
          <span class="recording-timer">{{ formatRecordingTime(recordingTime) }}</span>
        </div>
        <div class="recording-actions">
          <button type="button" @click="cancelRecording" class="cancel-btn"><Trash2 :size="18" /></button>
          <button type="button" @click="stopRecording" class="stop-btn"><Square :size="18" /></button>
        </div>
      </div>

      <template v-else>
        <button type="button" class="attachment-btn" @click="fileInput?.click()">
          <Paperclip :size="20" />
        </button>
        
        <button type="button" class="attachment-btn mic-btn" @click="handleToggleRecording">
          <Mic :size="20" />
        </button>

        <input
          v-model="newMsg"
          placeholder="اكتب رسالتك..."
          :disabled="isSending"
          @input="onInput"
          id="chat-input-field"
          autocomplete="off"
        />
        <button type="submit" :disabled="isSending || (!newMsg.trim() && !selectedFile && !audioBlob)">
          {{ isSending ? '...' : '→' }}
        </button>
      </template>
    </form>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 65px);
  background-color: var(--color-bg);
  position: absolute;
  inset: 0;
  z-index: 40;
}

.chat-header {
  height: 60px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  flex-shrink: 0;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
}

.title-area {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.chat-title { font-weight: 700; color: var(--color-primary); }
.chat-code { font-size: var(--text-xs); color: var(--color-text-muted); }

.back-btn {
  background: transparent;
  border: none;
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-bottom: var(--space-6);
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--color-text-muted);
  text-align: center;
  opacity: 0.6;
  gap: var(--space-2);
}

.msg {
  max-width: 85%;
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  font-size: 0.95rem;
  word-break: break-word;
  line-height: 1.4;
  will-change: transform, opacity;
}
.msg.customer {
  align-self: flex-end;
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
  color: var(--color-primary);
  border-bottom-right-radius: 4px;
}
.msg.support {
  align-self: flex-start;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-bottom-left-radius: 4px;
}
.msg-ts { font-size: 11px; color: var(--color-text-muted); margin-top: 4px; display: block; }

.typing-indicator {
  align-self: flex-start;
  display: flex;
  gap: 4px;
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border-bottom-left-radius: 4px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-text-muted);
  animation: typingBounce 0.6s infinite alternate;
}
.dot:nth-child(2) { animation-delay: 0.15s; }
.dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes typingBounce {
  to { opacity: 0.3; transform: translateY(-4px); }
}

.chat-input {
  display: flex;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  gap: var(--space-2);
  flex-shrink: 0;
  padding-bottom: calc(var(--space-3) + env(safe-area-inset-bottom));
}
.chat-input input {
  flex: 1;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  outline: none;
  font-family: inherit;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.attachment-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--space-1);
}
.attachment-btn:hover { color: var(--color-primary); }

.file-preview-strip {
  background: var(--color-surface-2);
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--color-border);
}
.preview-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--color-surface);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  max-width: fit-content;
  position: relative;
}
.preview-item .thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; }
.preview-item .name { font-size: 0.85rem; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.remove-file {
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--color-magenta);
  color: white;
  border: none;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* Attachment bubble styles */
.msg-file { margin-bottom: var(--space-2); border-radius: var(--radius-md); overflow: hidden; }
.msg-img { max-width: 100%; max-height: 300px; display: block; border-radius: var(--radius-md); cursor: pointer; }
.file-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: rgba(0,0,0,0.05);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.file-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.file-name { font-size: 0.9rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.file-meta { font-size: 0.75rem; opacity: 0.7; }
.dl-icon { opacity: 0.5; }

.msg-audio {
  max-width: 100%;
  height: 36px;
  border-radius: 20px;
}

.recording-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
  padding: 0 var(--space-4);
  border-radius: var(--radius-full);
}

.recording-dots {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.recording-dot {
  width: 8px;
  height: 8px;
  background: var(--color-magenta);
  border-radius: 50%;
  animation: pulse 0.8s infinite alternate;
}

.recording-timer {
  font-family: monospace;
  font-weight: 700;
  color: var(--color-magenta);
}

.recording-actions {
  display: flex;
  gap: var(--space-2);
}

.recording-actions button {
  background: transparent;
  width: 32px;
  height: 32px;
  color: var(--color-text-muted);
}

.cancel-btn:hover { color: var(--color-magenta); }
.stop-btn:hover { color: var(--color-primary); }

@keyframes pulse {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0.4; transform: scale(1.1); }
}

.mic-btn:hover { color: var(--color-magenta); }

.audio-preview {
  border: 1px solid var(--color-magenta);
}
.audio-preview .mic-icon { color: var(--color-magenta); }

.chat-input input:focus { border-color: color-mix(in srgb, var(--color-primary) 50%, transparent); }
.chat-input button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-primary);
  border: none;
  color: white;
  font-weight: 700;
  cursor: pointer;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
  will-change: transform;
}
.chat-input button:active { transform: scale(0.95); }
.chat-input button:disabled { opacity: 0.5; cursor: default; }

.chat-loading { display: flex; justify-content: center; padding: var(--space-8); }
.spinner-small {
  width: 24px; height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
