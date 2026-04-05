import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import type { ChatMessage } from '@/types'

export const useChatStore = defineStore('chat', () => {
  // State
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const isSending = ref(false)
  const isTyping = ref(false) // Support is typing
  const currentDeviceCode = ref<string | null>(null)
  const lastMessageTime = ref(0)

  // Getters
  const hasMessages = computed(() => messages.value.length > 0)
  const unreadCount = computed(() =>
    messages.value.filter(m => !m.is_read && m.sender_type === 'support').length
  )

  // Anti-spam: 10 seconds between messages
  const canSend = computed(() => Date.now() - lastMessageTime.value > 10000)

  // Actions
  async function fetchMessages(deviceCode: string): Promise<void> {
    isLoading.value = true
    currentDeviceCode.value = deviceCode
    try {
      const res = await api.get(`/api/chat/${deviceCode}/messages`)
      if (res.data.success) {
        messages.value = res.data.data
      }
    } catch {
      messages.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function sendMessage(deviceCode: string, message: string): Promise<boolean> {
    if (!canSend.value) return false
    isSending.value = true
    try {
      const res = await api.post(`/api/chat/${deviceCode}/messages`, { message })
      if (res.data.success) {
        messages.value.push(res.data.data)
        lastMessageTime.value = Date.now()
        return true
      }
      return false
    } catch {
      return false
    } finally {
      isSending.value = false
    }
  }

  function addMessage(message: ChatMessage): void {
    // Avoid duplicates
    if (!messages.value.find(m => m.id === message.id)) {
      messages.value.push(message)
    }
  }

  function setTyping(typing: boolean): void {
    isTyping.value = typing
  }

  function clearChat(): void {
    messages.value = []
    currentDeviceCode.value = null
  }

  return {
    messages,
    isLoading,
    isSending,
    isTyping,
    currentDeviceCode,
    hasMessages,
    unreadCount,
    canSend,
    fetchMessages,
    sendMessage,
    addMessage,
    setTyping,
    clearChat,
  }
})
