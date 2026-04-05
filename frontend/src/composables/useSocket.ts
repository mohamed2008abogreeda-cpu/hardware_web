import { onUnmounted, ref } from 'vue'
import { connectSocket, joinDeviceRoom, sendTyping, sendStopTyping, disconnectSocket } from '@/services/socket'

/**
 * Composable for Socket.IO device room management.
 * Per SOCKET-EVENTS.md spec.
 */
export function useSocket(deviceCode?: string) {
  const isConnected = ref(false)

  const socket = connectSocket()

  socket.on('connect', () => {
    isConnected.value = true
    if (deviceCode) {
      joinDeviceRoom(deviceCode)
    }
  })

  socket.on('disconnect', () => {
    isConnected.value = false
  })

  let typingTimer: ReturnType<typeof setTimeout> | null = null

  function emitTyping() {
    if (deviceCode) {
      sendTyping(deviceCode)
      if (typingTimer) clearTimeout(typingTimer)
      typingTimer = setTimeout(() => {
        if (deviceCode) sendStopTyping(deviceCode)
      }, 3000)
    }
  }

  onUnmounted(() => {
    if (typingTimer) clearTimeout(typingTimer)
  })

  return {
    socket,
    isConnected,
    emitTyping,
  }
}
