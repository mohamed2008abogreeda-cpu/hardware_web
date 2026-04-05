import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { connectSocket } from '@/services/socket'
import type { DevicePublic } from '@/types'

export const useDevicesStore = defineStore('devices', () => {
  // State
  const devices = ref<DevicePublic[]>([])
  const currentDevice = ref<DevicePublic | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const deviceCount = computed(() => devices.value.length)
  const activeDevices = computed(() =>
    devices.value.filter(d => d.displayStatus !== 'تم التسليم')
  )

  // Actions
  async function fetchMyDevices(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const res = await api.get('/api/devices')
      if (res.data.success) {
        devices.value = res.data.data
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      error.value = e.response?.data?.error || 'فشل في تحميل الأجهزة'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchDevice(code: string): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const res = await api.get(`/api/devices/${code}`)
      if (res.data.success) {
        currentDevice.value = res.data.data
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      error.value = e.response?.data?.error || 'الجهاز غير موجود'
      currentDevice.value = null
    } finally {
      isLoading.value = false
    }
  }

  function updateDeviceStatus(code: string, newStatus: DevicePublic['displayStatus']): void {
    const device = devices.value.find(d => d.rep_code === code)
    if (device) device.displayStatus = newStatus
    if (currentDevice.value?.rep_code === code) {
      currentDevice.value.displayStatus = newStatus
    }
  }

  function clearCurrent(): void {
    currentDevice.value = null
  }

  /**
   * Listen for real-time status updates via Socket.IO.
   * Should be called once after auth is confirmed.
   */
  function listenForUpdates(): void {
    try {
      const socket = connectSocket()

      // Status changed — live update
      socket.on('server:device:statusChanged', (data: { deviceCode: string; newStatus: string }) => {
        updateDeviceStatus(data.deviceCode, data.newStatus)
      })

      // Device ready — trigger confetti on the current detail page
      socket.on('server:device:ready', (data: { deviceCode: string }) => {
        updateDeviceStatus(data.deviceCode, 'جاهز للاستلام')
      })

      // New chat message — could show a notification badge
      socket.on('server:chat:message', (_data: { deviceCode: string }) => {
        // Future: show notification count
      })
    } catch {
      // Socket not available — silent fail
    }
  }

  return {
    devices,
    currentDevice,
    isLoading,
    error,
    deviceCount,
    activeDevices,
    fetchMyDevices,
    fetchDevice,
    updateDeviceStatus,
    clearCurrent,
    listenForUpdates,
  }
})
