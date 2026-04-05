import { io, type Socket } from 'socket.io-client'
import { SOCKET_EVENTS } from '@/types'
import { useDevicesStore } from '@/stores/devices'
import { useChatStore } from '@/stores/chat'
import type { ChatMessage, DisplayStatus } from '@/types'

let socket: Socket | null = null

export function connectSocket(): Socket {
  if (socket?.connected) return socket

  socket = io(import.meta.env.VITE_API_URL || window.location.origin, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
  })

  socket.on('connect', () => {
    console.log('[Socket.IO] Connected:', socket?.id)
  })

  socket.on('disconnect', () => {
    console.log('[Socket.IO] Disconnected')
  })

  // Listen for device status changes
  socket.on(SOCKET_EVENTS.SERVER_STATUS_CHANGED, (data: { deviceId: string; newStatus: DisplayStatus }) => {
    const devicesStore = useDevicesStore()
    devicesStore.updateDeviceStatus(data.deviceId, data.newStatus)
  })

  // Listen for new chat messages
  socket.on(SOCKET_EVENTS.SERVER_MESSAGE, (message: ChatMessage) => {
    const chatStore = useChatStore()
    chatStore.addMessage(message)
  })

  // Listen for typing indicator
  socket.on(SOCKET_EVENTS.SERVER_TYPING, () => {
    const chatStore = useChatStore()
    chatStore.setTyping(true)
  })

  socket.on(SOCKET_EVENTS.SERVER_STOP_TYPING, () => {
    const chatStore = useChatStore()
    chatStore.setTyping(false)
  })

  return socket
}

export function joinDeviceRoom(deviceCode: string): void {
  socket?.emit(SOCKET_EVENTS.CLIENT_JOIN_DEVICE, { deviceId: deviceCode })
}

export function sendTyping(deviceCode: string): void {
  socket?.emit(SOCKET_EVENTS.CLIENT_TYPING, { deviceId: deviceCode })
}

export function sendStopTyping(deviceCode: string): void {
  socket?.emit(SOCKET_EVENTS.CLIENT_STOP_TYPING, { deviceId: deviceCode })
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}

export function getSocket(): Socket | null {
  return socket
}
