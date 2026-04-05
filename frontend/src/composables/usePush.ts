import { ref } from 'vue'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export function usePush() {
  const isSupported = ref('serviceWorker' in navigator && 'PushManager' in window)
  const isSubscribed = ref(false)
  const isLoading = ref(false)

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const checkSubscription = async () => {
    if (!isSupported.value) return
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    isSubscribed.value = !!subscription
  }

  const subscribe = async () => {
    if (!isSupported.value) return
    isLoading.value = true
    try {
      // 1. Register SW
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // 2. Get Public Key
      const { data } = await axios.get(`${API_BASE}/push/keys`, { withCredentials: true })
      const publicKey = data.publicKey

      // 3. Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      })

      // 4. Send to backend
      await axios.post(`${API_BASE}/push/subscribe`, { subscription }, { withCredentials: true })
      
      isSubscribed.value = true
      return true
    } catch (err) {
      console.error('Failed to subscribe to push:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  const unsubscribe = async () => {
    if (!isSupported.value) return
    isLoading.value = true
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        // Optional: Notify backend
        isSubscribed.value = false
      }
    } catch (err) {
      console.error('Failed to unsubscribe:', err)
    } finally {
      isLoading.value = false
    }
  }

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    checkSubscription
  }
}
