<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import api from '@/services/api'
import { connectSocket } from '@/services/socket'
import { gsap } from 'gsap'
import { Paperclip, X, FileText, Download, Send, Mic, Square, Trash2 } from 'lucide-vue-next'
import { useVoiceRecorder } from '@/composables/useVoiceRecorder'

interface Conversation {
  conversation_id: string
  device_code: string
  last_message_at: string
  message_count: number
  unread_count: number
  last_message: string
  customer_phone: string
  customer_name: string
}

interface Message {
  id: number
  device_code: string
  sender_type: 'customer' | 'support'
  message: string
  timestamp: string
  is_read: number
  conversation_id: string | null
  file_url?: string
  file_type?: string
  file_size?: number
}

const conversations = ref<Conversation[]>([])
const selectedConvId = ref<string | null>(null)
const messages = ref<Message[]>([])
const newMessage = ref('')
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isLoadingConvs = ref(true)
const isLoadingMsgs = ref(false)
const isSending = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const { isRecording, recordingTime, audioBlob, startRecording, stopRecording, cancelRecording, formatTime: formatRecordingTime } = useVoiceRecorder()

const selectedConv = computed(() =>
  conversations.value.find(c => c.conversation_id === selectedConvId.value)
)

onMounted(async () => {
  await loadConversations()
  gsap.fromTo('.conv-item',
    { opacity: 0, x: -20 },
    { opacity: 1, x: 0, duration: 0.3, stagger: 0.04 }
  )

  // Socket connection for real-time support
  const socket = connectSocket()
  socket.emit('support:join')

  socket.on('admin:chat:newMessage', (msg: Message & { deviceCode: string }) => {
    // 1. Update existing conversation or add new one
    const conv = conversations.value.find(c => c.device_code === msg.deviceCode)
    if (conv) {
      conv.last_message = msg.message
      conv.last_message_at = msg.timestamp
      if (selectedConvId.value !== conv.conversation_id) {
        conv.unread_count++
      }
      // move to top
      conversations.value = [
        conv,
        ...conversations.value.filter(c => c.conversation_id !== conv.conversation_id)
      ]
    } else {
      // Reload conversations if it's a completely new chat we don't have
      loadConversations()
    }

    // 2. If it's the currently open chat, append message
    if (selectedConv.value && selectedConv.value.device_code === msg.deviceCode) {
      // Avoid duplicate if we just sent it
      if (!messages.value.some(m => m.id === msg.id)) {
        messages.value.push(msg)
        nextTick(() => scrollToBottom())
      }
    }
  })
})

async function loadConversations() {
  isLoadingConvs.value = true
  try {
    const res = await api.get('/api/admin/conversations')
    if (res.data.success) conversations.value = res.data.data
  } catch { /* empty */ } finally {
    isLoadingConvs.value = false
  }
}

async function selectConversation(conv: Conversation) {
  selectedConvId.value = conv.conversation_id
  conv.unread_count = 0 // Clear unread badge
  isLoadingMsgs.value = true
  try {
    const res = await api.get(`/api/chat/${conv.device_code}/messages`)
    if (res.data.success) messages.value = res.data.data
  } catch { /* empty */ } finally {
    isLoadingMsgs.value = false
    await nextTick()
    scrollToBottom()
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

async function sendReply() {
  if ((!newMessage.value.trim() && !selectedFile.value && !audioBlob.value) || !selectedConv.value || isSending.value) return
  isSending.value = true

  const formData = new FormData()
  if (newMessage.value.trim()) formData.append('message', newMessage.value.trim())
  if (selectedFile.value) formData.append('file', selectedFile.value)
  if (audioBlob.value) {
    formData.append('file', audioBlob.value, 'voice-reply.webm')
  }

  try {
    const res = await api.post(`/api/chat/${selectedConv.value.device_code}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    if (res.data.success) {
      messages.value.push(res.data.data)
      newMessage.value = ''
      selectedFile.value = null
      audioBlob.value = null
      if (fileInput.value) fileInput.value.value = ''
      await nextTick()
      scrollToBottom()
    }
  } catch (err: any) {
    const errorMsg = err.response?.data?.error || 'حدث خطأ أثناء الإرسال، يرجى المحاولة مرة أخرى.';
    alert(errorMsg);
  } finally {
    isSending.value = false
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

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `${Math.floor(diff / 60)} د`
  if (diff < 86400) return `${Math.floor(diff / 3600)} س`
  return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })
}

const openFile = (url: string) => window.open(url, '_blank')
const getPreviewUrl = (file: File) => URL.createObjectURL(file)
</script>

<template>
  <div class="chat-admin">
    <h1 class="page-title">المحادثات</h1>

    <div class="chat-layout">
      <!-- Conversation List -->
      <aside class="conv-list">
        <div v-if="isLoadingConvs" class="conv-loading">
          <div v-for="i in 5" :key="i" class="card conv-item">
            <div class="skeleton skeleton-text" style="width:60%"></div>
            <div class="skeleton skeleton-text" style="width:80%"></div>
          </div>
        </div>

        <div v-else-if="conversations.length === 0" class="empty-state">
          <p>💬 لا توجد محادثات</p>
        </div>

        <div
          v-else
          v-for="conv in conversations"
          :key="conv.conversation_id"
          class="card conv-item"
          :class="{ active: selectedConvId === conv.conversation_id }"
          @click="selectConversation(conv)"
        >
          <div class="conv-header">
            <div style="display:flex; flex-direction:column; gap:2px;">
              <span class="conv-code code">{{ conv.device_code }}</span>
              <span style="font-size:11px; color:var(--color-primary); font-weight:600;">{{ conv.customer_name }}</span>
              <span style="font-size:11px; color:#aaa; font-family:monospace;">{{ conv.customer_phone }}</span>
            </div>
            <span class="conv-time">{{ formatDate(conv.last_message_at) }}</span>
          </div>
          <p class="conv-preview">{{ conv.last_message }}</p>
          <span v-if="conv.unread_count > 0" class="conv-badge">{{ conv.unread_count }}</span>
        </div>
      </aside>

      <!-- Messages Panel -->
      <main class="messages-panel">
        <div v-if="!selectedConvId" class="empty-state">
          <p>📨 اختر محادثة من القائمة</p>
        </div>

        <template v-else>
          <div class="messages-header card">
            <div style="display:flex; flex-direction:column; gap:4px;">
              <span class="code">{{ selectedConv?.device_code }}</span>
              <span style="font-size:13px; color:var(--color-text-muted);">
                {{ selectedConv?.customer_name }} - {{ selectedConv?.customer_phone }}
              </span>
            </div>
            <span class="msg-count">{{ messages.length }} رسالة</span>
          </div>

          <div class="messages-body" ref="messagesContainer">
            <div v-if="isLoadingMsgs" class="loading-messages">
              <div v-for="i in 4" :key="i" class="skeleton skeleton-text" :style="{ width: `${40 + i * 10}%` }"></div>
            </div>

            <div
              v-else
              v-for="msg in messages"
              :key="msg.id"
              class="message-bubble"
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

              <p v-if="msg.message" class="msg-text">{{ msg.message }}</p>
              <span class="msg-time">{{ formatTime(msg.timestamp) }}</span>
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

          <form class="message-input" @submit.prevent="sendReply">
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
              <button type="button" class="attachment-btn" @click="handleToggleRecording">
                <Mic :size="20" />
              </button>
              <input
                v-model="newMessage"
                class="input"
                placeholder="اكتب رد..."
                :disabled="isSending"
                id="admin-chat-input"
              />
              <button type="submit" class="btn btn-primary" :disabled="isSending || (!newMessage.trim() && !selectedFile && !audioBlob)" id="admin-chat-send">
                <Send v-if="!isSending" :size="20" />
                <span v-else>...</span>
              </button>
            </template>
          </form>
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped>
.chat-admin { max-width: 1200px; }
.page-title { font-size: var(--text-3xl); font-weight: 700; margin-bottom: var(--space-6); }

.chat-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: var(--space-4);
  height: calc(100vh - 180px);
  min-height: 500px;
}

.conv-list {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.conv-item {
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  position: relative;
  transition: all var(--transition-fast);
}
.conv-item:hover { border-color: var(--color-primary); }
.conv-item.active { border-color: var(--color-accent); background: color-mix(in srgb, var(--color-accent) 5%, var(--color-surface)); }

.conv-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-1); }
.conv-code { font-size: var(--text-sm); }
.conv-time { font-size: var(--text-xs); color: var(--color-text-muted); }
.conv-preview { font-size: var(--text-sm); color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.conv-badge {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  background: var(--color-primary);
  color: var(--color-bg);
  font-size: var(--text-xs);
  font-weight: 700;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.messages-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages-header {
  padding: var(--space-3) var(--space-4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.msg-count { font-size: var(--text-sm); color: var(--color-text-muted); }

.messages-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.message-bubble {
  max-width: 75%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  word-break: break-word;
}
.message-bubble.customer {
  align-self: flex-end;
  background: var(--color-surface-2);
  border-bottom-right-radius: 4px;
}
.message-bubble.support {
  align-self: flex-start;
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
  color: var(--color-primary);
  border-bottom-left-radius: 4px;
}
.msg-text { margin-bottom: var(--space-1); line-height: 1.6; }
.msg-time { font-size: var(--text-xs); color: var(--color-text-muted); }

.message-input {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
  background: var(--color-surface);
}
.message-input .input { flex: 1; }

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
  padding: var(--space-2) var(--space-3);
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
.msg-img { max-width: 100%; max-height: 250px; display: block; border-radius: var(--radius-md); cursor: pointer; }
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
  height: 32px;
  margin-top: 4px;
}

.recording-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
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
  border: none;
  width: 32px;
  height: 32px;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cancel-btn:hover { color: var(--color-magenta); }
.stop-btn:hover { color: var(--color-primary); }

@keyframes pulse {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0.4; transform: scale(1.1); }
}

.audio-preview {
  border: 1px solid var(--color-magenta);
}
.audio-preview .mic-icon { color: var(--color-magenta); }


.empty-state { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--color-text-muted); font-size: var(--text-lg); }
.loading-messages { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); }

@media (max-width: 768px) {
  .chat-layout { grid-template-columns: 1fr; height: auto; }
  .conv-list { max-height: 300px; }
}
</style>
