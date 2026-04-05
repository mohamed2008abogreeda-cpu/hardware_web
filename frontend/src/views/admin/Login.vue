<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const twoFactorCode = ref('')
const isLoading = ref(false)
const errorMsg = ref('')
const needs2FA = ref(false)

async function handleLogin() {
  isLoading.value = true
  errorMsg.value = ''

  const result = await auth.adminLogin({
    username: username.value,
    password: password.value,
    twoFactorCode: needs2FA.value ? twoFactorCode.value : undefined,
  })

  isLoading.value = false

  if (result.success) {
    router.push({ name: 'AdminDashboard' })
  } else if (result.requires2FA) {
    needs2FA.value = true
  } else {
    errorMsg.value = result.message || 'بيانات خاطئة'
  }
}
</script>

<template>
  <div class="admin-login-page admin-theme">
    <div class="container">
      <div class="glass-panel card login-card">
        <div class="login-header">
          <img src="/logo.png" alt="هارد وير" class="admin-logo" />
          <h1>لوحة التحكم</h1>
          <p>هارد وير — لوحة تحكم الإدارة</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <input
            v-model="username"
            class="input"
            placeholder="اسم المستخدم"
            autocomplete="username"
            id="admin-username"
          />
          <input
            v-model="password"
            type="password"
            class="input"
            placeholder="كلمة المرور"
            autocomplete="current-password"
            id="admin-password"
          />

          <input
            v-if="needs2FA"
            v-model="twoFactorCode"
            class="input"
            placeholder="رمز التحقق الثنائي"
            dir="ltr"
            maxlength="6"
            id="admin-2fa"
          />

          <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

          <button type="submit" class="btn btn-primary login-btn" :disabled="isLoading" id="admin-login-btn">
            <span v-if="isLoading" class="spinner"></span>
            <span v-else>دخول</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: var(--space-8); background: var(--color-bg); }
.login-card { max-width: 420px; width: 100%; padding: var(--space-12); }
.login-header { text-align: center; margin-bottom: var(--space-8); }
.admin-logo { width: 100px; height: 100px; object-fit: contain; margin: 0 auto var(--space-4); border-radius: var(--radius-xl); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
.admin-icon { font-size: 3rem; margin-bottom: var(--space-4); }
.login-header h1 { font-size: var(--text-2xl); font-weight: 800; color: var(--color-primary); }
.login-header p { color: var(--color-text-muted); margin-top: var(--space-2); font-weight: 500; }
.login-form { display: flex; flex-direction: column; gap: var(--space-4); }
.login-btn { width: 100%; padding: var(--space-4); }
.error-msg { color: #EF4444; font-size: var(--text-sm); text-align: center; }
.spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
