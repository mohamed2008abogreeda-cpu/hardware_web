import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import type { OtpRequest, OtpVerify, AdminLogin } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  // State
  const phone = ref<string | null>(localStorage.getItem('hw_phone'))
  const isAuthenticated = ref(!!localStorage.getItem('hw_auth'))
  const isAdmin = ref(!!localStorage.getItem('hw_admin'))
  const adminRole = ref<'admin' | 'tech' | 'viewer' | null>(
    (localStorage.getItem('hw_admin_role') as 'admin' | 'tech' | 'viewer') || null
  )
  const pendingPhone = ref<string | null>(null)

  // Getters
  const userPhone = computed(() => phone.value)
  const isLoggedIn = computed(() => isAuthenticated.value)
  const isAdminLoggedIn = computed(() => isAdmin.value)

  // Actions
  async function requestOtp(data: OtpRequest): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await api.post('/api/auth/request-otp', data)
      if (res.data.success) {
        pendingPhone.value = data.phone
      }
      return res.data
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      return { success: false, message: error.response?.data?.error || 'حدث خطأ' }
    }
  }

  async function verifyOtp(data: OtpVerify): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await api.post('/api/auth/verify-otp', data)
      if (res.data.success) {
        phone.value = data.phone
        isAuthenticated.value = true
        localStorage.setItem('hw_phone', data.phone)
        localStorage.setItem('hw_auth', 'true')
        pendingPhone.value = null
      }
      return res.data
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      return { success: false, message: error.response?.data?.error || 'رمز خاطئ' }
    }
  }

  async function adminLogin(data: AdminLogin): Promise<{ success: boolean; message?: string; requires2FA?: boolean }> {
    try {
      const res = await api.post('/api/admin/auth/login', data)
      if (res.data.success) {
        isAdmin.value = true
        adminRole.value = res.data.data?.role || 'admin'
        localStorage.setItem('hw_admin', 'true')
        if (adminRole.value) {
           localStorage.setItem('hw_admin_role', adminRole.value)
        }
      }
      return res.data
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string; requires2FA?: boolean } } }
      return {
        success: false,
        message: error.response?.data?.error || 'بيانات خاطئة',
        requires2FA: error.response?.data?.requires2FA,
      }
    }
  }

  async function logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout')
    } catch {
      // Ignore errors during logout
    }
    phone.value = null
    isAuthenticated.value = false
    localStorage.removeItem('hw_phone')
    localStorage.removeItem('hw_auth')
  }

  async function adminLogout(): Promise<void> {
    try {
      await api.post('/api/admin/auth/logout')
    } catch {
      // Ignore errors during logout
    }
    isAdmin.value = false
    adminRole.value = null
    localStorage.removeItem('hw_admin')
    localStorage.removeItem('hw_admin_role')
  }

  return {
    phone,
    isAuthenticated,
    isAdmin,
    adminRole,
    pendingPhone,
    userPhone,
    isLoggedIn,
    isAdminLoggedIn,
    requestOtp,
    verifyOtp,
    adminLogin,
    logout,
    adminLogout,
  }
})
