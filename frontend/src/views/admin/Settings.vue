<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import api from '@/services/api'
import {
  FolderOpen, MessageCircle, Shield, Clock, Globe, BarChart3,
  AlertTriangle, RefreshCw, Save, Wifi, WifiOff, QrCode, Loader2,
  Database, FileText, Key, Timer, Bell, Eye, EyeOff, Server, Zap
} from 'lucide-vue-next'

const settings = ref<Record<string, string>>({})
const isLoading = ref(true)
const isSaving = ref(false)
const saveMsg = ref('')
const activeSection = ref('operations')

// WhatsApp state
const waStatus = ref<{ enabled: boolean; status: string; isReady: boolean; qrDataUrl: string | null; lastError: string | null } | null>(null)
const waLoading = ref(false)
let waPoller: ReturnType<typeof setInterval> | null = null

// Notification Templates
interface NotifTemplate { event_type: string; template: string; enabled: number; channels: string; }
const templates = ref<NotifTemplate[]>([])

// Setting sections configuration
const sections = [
  { id: 'operations', label: 'العمليات', icon: Zap },
  { id: 'paths', label: 'المسارات', icon: FolderOpen },
  { id: 'whatsapp', label: 'واتساب', icon: MessageCircle },
  { id: 'notifications', label: 'التنبيهات', icon: MessageCircle },
  { id: 'security', label: 'الأمان', icon: Shield },
  { id: 'scheduling', label: 'الجدولة', icon: Clock },
  { id: 'network', label: 'الشبكة', icon: Globe },
  { id: 'analytics', label: 'التحليلات', icon: BarChart3 },
  { id: 'display', label: 'العرض والبحث', icon: Eye },
]

// Settings requiring server restart
const restartRequired = new Set([
  'access_db_path', 'sqlite_db_path', 'server_port', 'redis_url', 'json_body_limit'
])

onMounted(async () => {
  try {
    const res = await api.get('/api/admin/settings')
    if (res.data.success) settings.value = res.data.data
    
    const tRes = await api.get('/api/admin/notification-templates')
    if (tRes.data.success) templates.value = tRes.data.data
  } catch { /* empty */ } finally {
    isLoading.value = false
  }
  fetchWaStatus()
  waPoller = setInterval(fetchWaStatus, 5000)
})

onUnmounted(() => {
  if (waPoller) clearInterval(waPoller)
})

async function fetchWaStatus() {
  try {
    const res = await api.get('/api/admin/whatsapp/status')
    if (res.data.success) waStatus.value = res.data.data
  } catch { /* ignore */ }
}

async function saveSetting(key: string, value: string) {
  isSaving.value = true
  saveMsg.value = ''
  try {
    const res = await api.put('/api/admin/settings', { key, value })
    if (res.data.success) {
      saveMsg.value = '✓ تم الحفظ'
      if (restartRequired.has(key)) {
        saveMsg.value = '✓ تم الحفظ — يتطلب إعادة تشغيل السيرفر'
      }
      setTimeout(() => { saveMsg.value = '' }, 3000)
    }
  } catch {
    saveMsg.value = '✕ خطأ في الحفظ'
  } finally {
    isSaving.value = false
  }
}

function toggle(key: string) {
  const newVal = settings.value[key] === 'true' ? 'false' : 'true'
  settings.value[key] = newVal
  saveSetting(key, newVal)
}

function updateSetting(key: string, event: Event) {
  const val = (event.target as HTMLInputElement).value
  settings.value[key] = val
  saveSetting(key, val)
}

async function restartWa() {
  waLoading.value = true
  try {
    await api.post('/api/admin/whatsapp/restart')
    saveMsg.value = '✓ تم إعادة تشغيل واتساب'
    setTimeout(() => { saveMsg.value = '' }, 3000)
  } catch {
    saveMsg.value = '✕ فشل إعادة تشغيل واتساب'
  } finally {
    waLoading.value = false
  }
}

async function saveTemplate(t: NotifTemplate) {
  isSaving.value = true
  saveMsg.value = ''
  try {
    const res = await api.put(`/api/admin/notification-templates/${t.event_type}`, {
      template: t.template,
      enabled: t.enabled,
      channels: t.channels
    })
    if (res.data.success) {
      saveMsg.value = '✓ تم حفظ قالب الإشعار'
      setTimeout(() => { saveMsg.value = '' }, 3000)
    }
  } catch {
    saveMsg.value = '✕ خطأ في الحفظ'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="settings-page">
    <h1 class="page-title">
      <Server :size="28" />
      إعدادات السيرفر
    </h1>
    <p class="page-subtitle">تحكم كامل في كل إعدادات النظام — حي ومباشر</p>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-grid">
      <div v-for="i in 6" :key="i" class="skeleton skeleton-card"></div>
    </div>

    <div v-else class="settings-layout">
      <!-- Sidebar Tabs -->
      <nav class="settings-tabs">
        <button
          v-for="s in sections" :key="s.id"
          class="tab-btn"
          :class="{ active: activeSection === s.id }"
          @click="activeSection = s.id"
        >
          <component :is="s.icon" :size="18" />
          <span>{{ s.label }}</span>
        </button>
      </nav>

      <!-- Content Area -->
      <div class="settings-content">

        <!-- ═══════════════ 🚨 Operations ═══════════════ -->
        <section v-if="activeSection === 'operations'" class="section-panel">
          <h2><Zap :size="22" /> العمليات والتشغيل</h2>

          <div class="setting-card" :class="{ danger: settings.emergency_stop === 'true' }">
            <div class="setting-header">
              <div>
                <h3><AlertTriangle :size="18" /> إيقاف الطوارئ</h3>
                <p>إيقاف جميع الإشعارات والرسائل فوراً</p>
              </div>
              <button class="toggle-chip" :class="settings.emergency_stop === 'true' ? 'on-danger' : 'off'" @click="toggle('emergency_stop')">
                {{ settings.emergency_stop === 'true' ? '🔴 مفعّل' : '✅ إيقاف' }}
              </button>
            </div>
          </div>

          <div class="setting-card">
            <div class="setting-header">
              <div>
                <h3><Bell :size="18" /> وضع الإجازة</h3>
                <p>عرض رسالة إجازة للعملاء</p>
              </div>
              <button class="toggle-chip" :class="settings.vacation_mode === 'true' ? 'on' : 'off'" @click="toggle('vacation_mode')">
                {{ settings.vacation_mode === 'true' ? '🏖️ مفعّل' : 'متوقف' }}
              </button>
            </div>
            <textarea
              v-if="settings.vacation_mode === 'true'"
              v-model="settings.vacation_message"
              class="input textarea-input"
              placeholder="رسالة الإجازة..."
              rows="3"
              @blur="saveSetting('vacation_message', settings.vacation_message)"
            ></textarea>
          </div>

          <div class="setting-card">
            <div class="setting-header">
              <div>
                <h3><Eye :size="18" /> تتبع الأجهزة العام</h3>
                <p>السماح للعملاء بتتبع حالة أجهزتهم</p>
              </div>
              <button class="toggle-chip" :class="settings.allow_public_tracking === 'true' ? 'on' : 'off'" @click="toggle('allow_public_tracking')">
                {{ settings.allow_public_tracking === 'true' ? 'مفعّل' : 'متوقف' }}
              </button>
            </div>
          </div>

          <div class="setting-card">
            <div class="setting-header">
              <div>
                <h3><EyeOff :size="18" /> وضع التجربة (Staging)</h3>
                <p>إرسال إشعارات للأرقام المسموحة فقط</p>
              </div>
              <button class="toggle-chip" :class="settings.staging_mode === 'true' ? 'on' : 'off'" @click="toggle('staging_mode')">
                {{ settings.staging_mode === 'true' ? 'مفعّل' : 'متوقف' }}
              </button>
            </div>
            <div v-if="settings.staging_mode === 'true'" class="sub-field">
              <label>أرقام Whitelist (مفصولة بفواصل)</label>
              <input type="text" :value="settings.staging_whitelist" class="input" dir="ltr" placeholder="01xxxxxxxxx, 01yyyyyyyyy" @change="updateSetting('staging_whitelist', $event)" />
            </div>
          </div>

          <div class="setting-card">
            <div class="row-fields">
              <div class="field">
                <label>⏰ بداية ساعات العمل</label>
                <input type="time" :value="settings.work_hours_start" class="input" @change="updateSetting('work_hours_start', $event)" />
              </div>
              <div class="field">
                <label>⏰ نهاية ساعات العمل</label>
                <input type="time" :value="settings.work_hours_end" class="input" @change="updateSetting('work_hours_end', $event)" />
              </div>
            </div>
          </div>

          <div class="setting-card">
            <div class="field">
              <label>📋 مستوى التسجيل (Log Level)</label>
              <select :value="settings.log_level" class="input" @change="updateSetting('log_level', $event)">
                <option value="debug">Debug</option>
                <option value="info">Info</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>
        </section>

        <!-- ═══════════════ 📂 File Paths ═══════════════ -->
        <section v-if="activeSection === 'paths'" class="section-panel">
          <h2><FolderOpen :size="22" /> مسارات الملفات</h2>
          <p class="section-hint">⚠️ تغيير هذه المسارات يتطلب إعادة تشغيل السيرفر</p>

          <div class="setting-card">
            <div class="field">
              <label><Database :size="16" /> مسار قاعدة بيانات Access (.mdb)</label>
              <input type="text" :value="settings.access_db_path" class="input mono" dir="ltr" @change="updateSetting('access_db_path', $event)" />
            </div>
          </div>

          <div class="setting-card">
            <div class="field">
              <label><Database :size="16" /> مسار قاعدة بيانات SQLite</label>
              <input type="text" :value="settings.sqlite_db_path" class="input mono" dir="ltr" @change="updateSetting('sqlite_db_path', $event)" />
            </div>
          </div>

          <div class="setting-card">
            <div class="field">
              <label><FileText :size="16" /> مسار جلسة واتساب</label>
              <input type="text" :value="settings.whatsapp_session_path" class="input mono" dir="ltr" @change="updateSetting('whatsapp_session_path', $event)" />
            </div>
          </div>
        </section>

        <!-- ═══════════════ 📱 WhatsApp ═══════════════ -->
        <section v-if="activeSection === 'whatsapp'" class="section-panel">
          <h2><MessageCircle :size="22" /> واتساب</h2>

          <!-- Live Status Card -->
          <div class="setting-card wa-status-card">
            <div class="setting-header">
              <div>
                <h3>
                  <component :is="waStatus?.isReady ? Wifi : WifiOff" :size="18" />
                  حالة الاتصال
                </h3>
                <p class="wa-status-text">
                  <span class="status-dot" :class="waStatus?.status || 'disconnected'"></span>
                  {{ {
                    disconnected: 'غير متصل',
                    connecting: 'جاري الاتصال...',
                    qr_pending: '📱 في انتظار مسح QR Code',
                    authenticated: 'تم المصادقة...',
                    ready: '✅ متصل وجاهز'
                  }[waStatus?.status || 'disconnected'] }}
                </p>
                <p v-if="waStatus?.lastError" class="wa-error">{{ waStatus.lastError }}</p>
              </div>
              <button class="btn btn-primary compact-btn" :disabled="waLoading" @click="restartWa">
                <Loader2 v-if="waLoading" :size="16" class="spin" />
                <RefreshCw v-else :size="16" />
                إعادة تشغيل
              </button>
            </div>

            <!-- QR Code Display -->
            <div v-if="waStatus?.qrDataUrl" class="qr-display">
              <div class="qr-wrapper">
                <img :src="waStatus.qrDataUrl" alt="WhatsApp QR Code" class="qr-image" />
              </div>
              <p class="qr-hint">امسح هذا الكود من تطبيق واتساب على هاتفك</p>
            </div>
          </div>

          <div class="setting-card">
            <div class="setting-header">
              <div>
                <h3>تفعيل واتساب</h3>
                <p>تشغيل/إيقاف خدمة الواتساب بالكامل</p>
              </div>
              <button class="toggle-chip" :class="settings.whatsapp_enabled === 'true' ? 'on' : 'off'" @click="toggle('whatsapp_enabled')">
                {{ settings.whatsapp_enabled === 'true' ? 'مفعّل' : 'متوقف' }}
              </button>
            </div>
          </div>

          <div class="setting-card">
            <div class="setting-header">
              <div>
                <h3>إعادة اتصال تلقائية</h3>
                <p>إعادة الاتصال تلقائياً عند الانقطاع</p>
              </div>
              <button class="toggle-chip" :class="settings.whatsapp_auto_reconnect === 'true' ? 'on' : 'off'" @click="toggle('whatsapp_auto_reconnect')">
                {{ settings.whatsapp_auto_reconnect === 'true' ? 'مفعّل' : 'متوقف' }}
              </button>
            </div>
          </div>

          <div class="setting-card">
            <div class="row-fields">
              <div class="field">
                <label>تأخير إعادة الاتصال (ms)</label>
                <input type="number" :value="settings.whatsapp_reconnect_delay_ms" class="input" dir="ltr" @change="updateSetting('whatsapp_reconnect_delay_ms', $event)" />
              </div>
              <div class="field">
                <label>كود الدولة الافتراضي</label>
                <input type="text" :value="settings.whatsapp_default_country_code" class="input" dir="ltr" placeholder="20" @change="updateSetting('whatsapp_default_country_code', $event)" />
              </div>
            </div>
          </div>

          <div class="setting-card">
            <div class="field">
              <label>رابط إصدار واتساب (WA Version URL)</label>
              <input type="text" :value="settings.whatsapp_version_url" class="input mono" dir="ltr" @change="updateSetting('whatsapp_version_url', $event)" />
            </div>
          </div>
        </section>

        <!-- ═══════════════ 💬 Notifications ═══════════════ -->
        <section v-if="activeSection === 'notifications'" class="section-panel">
          <h2><MessageCircle :size="22" /> رسائل التنبيهات (Notification Templates)</h2>
          <p class="section-hint">يمكنك استخدام المتغيرات مثل <code v-pre>{{name}}</code>، <code v-pre>{{deviceCode}}</code> داخل الرسالة لتعويضها بالبيانات الحقيقية.</p>

          <div v-for="t in templates" :key="t.event_type" class="setting-card">
            <div class="setting-header">
              <div>
                <h3>{{ t.event_type }}</h3>
              </div>
              <button class="toggle-chip" :class="t.enabled ? 'on' : 'off'" @click="t.enabled = t.enabled ? 0 : 1; saveTemplate(t)">
                {{ t.enabled ? 'مفعّل' : 'متوقف' }}
              </button>
            </div>
            
            <textarea
              v-model="t.template"
              class="input textarea-input"
              rows="4"
              @blur="saveTemplate(t)"
            ></textarea>

            <div class="sub-field" style="margin-top: var(--space-2)">
              <label>قنوات الإرسال (مفصولة بفاصلة: whatsapp, sms)</label>
              <input type="text" v-model="t.channels" class="input" dir="ltr" @blur="saveTemplate(t)" />
            </div>
          </div>
        </section>

        <!-- ═══════════════ 🔒 Security ═══════════════ -->
        <section v-if="activeSection === 'security'" class="section-panel">
          <h2><Shield :size="22" /> الأمان والحماية</h2>

          <div class="setting-card">
            <div class="row-fields">
              <div class="field">
                <label><Key :size="16" /> صلاحية JWT للعملاء</label>
                <input type="text" :value="settings.jwt_expires_in" class="input" dir="ltr" placeholder="24h" @change="updateSetting('jwt_expires_in', $event)" />
              </div>
              <div class="field">
                <label><Key :size="16" /> صلاحية JWT للإدارة</label>
                <input type="text" :value="settings.admin_jwt_expires_in" class="input" dir="ltr" placeholder="30m" @change="updateSetting('admin_jwt_expires_in', $event)" />
              </div>
            </div>
          </div>

          <div class="setting-card">
            <div class="setting-header">
              <div>
                <h3>حماية النسخ (Anti-Copy)</h3>
                <p>منع النسخ واللصق والكليك يمين في الإنتاج</p>
              </div>
              <button class="toggle-chip" :class="settings.anti_copy_enabled === 'true' ? 'on' : 'off'" @click="toggle('anti_copy_enabled')">
                {{ settings.anti_copy_enabled === 'true' ? 'مفعّل' : 'متوقف' }}
              </button>
            </div>
          </div>

          <div class="setting-card">
            <h3 class="card-section-title">حدود المعدل (Rate Limits)</h3>
            <div class="rate-limit-grid">
              <div class="rl-item">
                <span class="rl-label">بحث العميل</span>
                <div class="rl-fields">
                  <input type="number" :value="settings.rate_limit_search_max" class="input mini" dir="ltr" @change="updateSetting('rate_limit_search_max', $event)" /> <span class="rl-unit">محاولة /</span>
                  <input type="number" :value="settings.rate_limit_search_window_min" class="input mini" dir="ltr" @change="updateSetting('rate_limit_search_window_min', $event)" /> <span class="rl-unit">دقيقة</span>
                </div>
              </div>
              <div class="rl-item">
                <span class="rl-label">تسجيل دخول الإدارة</span>
                <div class="rl-fields">
                  <input type="number" :value="settings.rate_limit_admin_max" class="input mini" dir="ltr" @change="updateSetting('rate_limit_admin_max', $event)" /> <span class="rl-unit">محاولة /</span>
                  <input type="number" :value="settings.rate_limit_admin_window_min" class="input mini" dir="ltr" @change="updateSetting('rate_limit_admin_window_min', $event)" /> <span class="rl-unit">دقيقة</span>
                </div>
              </div>
              <div class="rl-item">
                <span class="rl-label">الشات</span>
                <div class="rl-fields">
                  <input type="number" :value="settings.rate_limit_chat_max" class="input mini" dir="ltr" @change="updateSetting('rate_limit_chat_max', $event)" /> <span class="rl-unit">رسالة /</span>
                  <input type="number" :value="settings.rate_limit_chat_window_sec" class="input mini" dir="ltr" @change="updateSetting('rate_limit_chat_window_sec', $event)" /> <span class="rl-unit">ثانية</span>
                </div>
              </div>
              <div class="rl-item">
                <span class="rl-label">API عام</span>
                <div class="rl-fields">
                  <input type="number" :value="settings.rate_limit_general_max" class="input mini" dir="ltr" @change="updateSetting('rate_limit_general_max', $event)" /> <span class="rl-unit">طلب /</span>
                  <input type="number" :value="settings.rate_limit_general_window_sec" class="input mini" dir="ltr" @change="updateSetting('rate_limit_general_window_sec', $event)" /> <span class="rl-unit">ثانية</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══════════════ ⏰ Scheduling ═══════════════ -->
        <section v-if="activeSection === 'scheduling'" class="section-panel">
          <h2><Clock :size="22" /> الجدولة والتوقيتات</h2>

          <div class="setting-card">
            <div class="field">
              <label><Timer :size="16" /> معدل تزامن قاعدة البيانات (ms)</label>
              <input type="number" :value="settings.polling_interval_ms" class="input" dir="ltr" @change="updateSetting('polling_interval_ms', $event)" />
              <span class="field-hint">القيمة الحالية: {{ Math.round(Number(settings.polling_interval_ms || 5000) / 1000) }} ثانية</span>
            </div>
          </div>

          <div class="setting-card">
            <div class="row-fields">
              <div class="field">
                <label>انتهاء الموافقات (ساعة)</label>
                <input type="number" :value="settings.approval_expiry_hours" class="input" dir="ltr" @change="updateSetting('approval_expiry_hours', $event)" />
              </div>
              <div class="field">
                <label>أيام التذكير للأجهزة الجاهزة</label>
                <input type="number" :value="settings.reminder_days" class="input" dir="ltr" @change="updateSetting('reminder_days', $event)" />
              </div>
            </div>
          </div>

          <div class="setting-card">
            <div class="row-fields">
              <div class="field">
                <label>وقت إرسال التذكير</label>
                <input type="time" :value="settings.reminder_time" class="input" @change="updateSetting('reminder_time', $event)" />
              </div>
              <div class="field">
                <label>تنظيف الجلسات كل (ساعة)</label>
                <input type="number" :value="settings.session_cleanup_hours" class="input" dir="ltr" @change="updateSetting('session_cleanup_hours', $event)" />
              </div>
            </div>
          </div>

          <div class="setting-card">
            <div class="row-fields">
              <div class="field">
                <label>محاولات إعادة إرسال الإشعار</label>
                <input type="number" :value="settings.queue_retry_attempts" class="input" dir="ltr" @change="updateSetting('queue_retry_attempts', $event)" />
              </div>
              <div class="field">
                <label>تأخير المحاولة (دقيقة)</label>
                <input type="number" :value="settings.queue_retry_delay_min" class="input" dir="ltr" @change="updateSetting('queue_retry_delay_min', $event)" />
              </div>
            </div>
          </div>
        </section>

        <!-- ═══════════════ 🌐 Network ═══════════════ -->
        <section v-if="activeSection === 'network'" class="section-panel">
          <h2><Globe :size="22" /> الشبكة والاتصال</h2>
          <p class="section-hint">⚠️ تغيير هذه الإعدادات يتطلب إعادة تشغيل السيرفر</p>

          <div class="setting-card">
            <div class="row-fields">
              <div class="field">
                <label>رقم البورت</label>
                <input type="number" :value="settings.server_port" class="input" dir="ltr" @change="updateSetting('server_port', $event)" />
              </div>
              <div class="field">
                <label>حد حجم JSON</label>
                <input type="text" :value="settings.json_body_limit" class="input" dir="ltr" placeholder="10mb" @change="updateSetting('json_body_limit', $event)" />
              </div>
            </div>
          </div>

          <div class="setting-card">
            <div class="field">
              <label>رابط الواجهة الأمامية (CORS)</label>
              <input type="text" :value="settings.frontend_url" class="input mono" dir="ltr" @change="updateSetting('frontend_url', $event)" />
            </div>
          </div>

          <div class="setting-card">
            <div class="field">
              <label>رابط Redis</label>
              <input type="text" :value="settings.redis_url" class="input mono" dir="ltr" @change="updateSetting('redis_url', $event)" />
            </div>
          </div>
        </section>

        <!-- ═══════════════ 📊 Analytics ═══════════════ -->
        <section v-if="activeSection === 'analytics'" class="section-panel">
          <h2><BarChart3 :size="22" /> التحليلات (PostHog)</h2>

          <div class="setting-card">
            <div class="setting-header">
              <div>
                <h3>تفعيل التحليلات</h3>
                <p>إرسال أحداث التتبع إلى PostHog</p>
              </div>
              <button class="toggle-chip" :class="settings.posthog_enabled === 'true' ? 'on' : 'off'" @click="toggle('posthog_enabled')">
                {{ settings.posthog_enabled === 'true' ? 'مفعّل' : 'متوقف' }}
              </button>
            </div>
          </div>

          <div class="setting-card">
            <div class="field">
              <label>PostHog API Key</label>
              <input type="text" :value="settings.posthog_api_key" class="input mono" dir="ltr" placeholder="phc_..." @change="updateSetting('posthog_api_key', $event)" />
            </div>
          </div>

          <div class="setting-card">
            <div class="field">
              <label>PostHog Host</label>
              <input type="text" :value="settings.posthog_host" class="input mono" dir="ltr" @change="updateSetting('posthog_host', $event)" />
            </div>
          </div>
        </section>

        <!-- ═══════════════ 👁️ Display & Search ═══════════════ -->
        <section v-if="activeSection === 'display'" class="section-panel">
          <h2><Eye :size="22" /> إعدادات العرض والبحث</h2>
          <p class="section-hint">تحكم في كيفية ظهور قائمة الأجهزة والتصنيفات</p>

          <div class="setting-card">
            <div class="field">
              <label>مصدر التصنيف (Classification Source)</label>
              <select :value="settings.device_classification_source" class="input" @change="updateSetting('device_classification_source', $event)">
                <option value="rep_case">موديل الجهاز (rep_case)</option>
                <option value="rep_memo">ملاحظات العميل (rep_memo)</option>
                <option value="rep_agent">اسم المورد/الشركة (rep_agent)</option>
              </select>
              <span class="field-hint">هذا هو الحقل الذي سيظهر في عمود "التصنيف" في جدول الأجهزة.</span>
            </div>
          </div>

          <div class="setting-card">
            <div class="row-fields">
              <div class="field">
                <label>الترتيب الافتراضي</label>
                <select :value="settings.device_list_default_sort" class="input" @change="updateSetting('device_list_default_sort', $event)">
                  <option value="rep_date1">تاريخ الاستلام</option>
                  <option value="rep_code">كود الجهاز</option>
                  <option value="rep_amount">المبلغ</option>
                  <option value="rep_name">اسم العميل</option>
                </select>
              </div>
              <div class="field">
                <label>اتجاه الترتيب</label>
                <select :value="settings.device_list_sort_dir" class="input" @change="updateSetting('device_list_sort_dir', $event)">
                  <option value="desc">تنازلي (الأحدث/الأكبر أولاً)</option>
                  <option value="asc">تصاعدي (الأقدم/الأصغر أولاً)</option>
                </select>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>

    <!-- Save Feedback Toast -->
    <Transition name="toast">
      <div v-if="saveMsg" class="save-toast" :class="{ error: saveMsg.startsWith('✕') }">
        <Save :size="16" />
        {{ saveMsg }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 1000px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-3xl);
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.page-subtitle {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  margin-bottom: var(--space-6);
}

/* ── Layout ── */
.settings-layout {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: var(--space-6);
  align-items: start;
}

@media (max-width: 768px) {
  .settings-layout {
    grid-template-columns: 1fr;
  }
}

/* ── Tabs ── */
.settings-tabs {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  position: sticky;
  top: var(--space-4);
}

@media (max-width: 768px) {
  .settings-tabs {
    flex-direction: row;
    overflow-x: auto;
    position: static;
    gap: var(--space-2);
    padding-bottom: var(--space-2);
  }
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.tab-btn:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}

.tab-btn.active {
  background: var(--color-primary);
  color: var(--color-bg);
  font-weight: 600;
}

/* ── Content ── */
.settings-content {
  display: flex;
  flex-direction: column;
}

.section-panel h2 {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-xl);
  font-weight: 700;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 2px solid var(--color-border);
}

.section-hint {
  font-size: var(--text-sm);
  color: #f59e0b;
  font-weight: 500;
  margin-bottom: var(--space-4);
  padding: var(--space-2) var(--space-3);
  background: rgba(245, 158, 11, 0.1);
  border-radius: var(--radius-sm);
}

/* ── Cards ── */
.setting-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-6);
  margin-bottom: var(--space-3);
  transition: border-color 0.2s ease;
}

.setting-card:hover {
  border-color: var(--color-text-muted);
}

.setting-card.danger {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
}

.setting-header h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-base);
  font-weight: 600;
  margin-bottom: var(--space-1);
}

.setting-header p {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

/* ── Toggle Chips ── */
.toggle-chip {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  border: none;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  min-width: 100px;
}

.toggle-chip.on { background: #10b981; color: white; }
.toggle-chip.on:hover { background: #059669; }
.toggle-chip.off { background: var(--color-surface-2); color: var(--color-text-muted); }
.toggle-chip.off:hover { background: var(--color-border); }
.toggle-chip.on-danger { background: #ef4444; color: white; }
.toggle-chip.on-danger:hover { background: #dc2626; }

/* ── Fields ── */
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
}

.field label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-muted);
}

.field-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.sub-field {
  margin-top: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sub-field label {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.row-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

@media (max-width: 500px) {
  .row-fields { grid-template-columns: 1fr; }
}

.mono { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: var(--text-sm); }
.textarea-input { width: 100%; margin-top: var(--space-4); font-family: inherit; resize: vertical; }

/* ── Rate Limits ── */
.card-section-title {
  font-size: var(--text-base);
  font-weight: 600;
  margin-bottom: var(--space-4);
}

.rate-limit-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.rl-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
}

.rl-item:last-child { border-bottom: none; }

.rl-label {
  font-size: var(--text-sm);
  font-weight: 500;
  min-width: 140px;
}

.rl-fields {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.rl-unit {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.input.mini {
  width: 60px;
  text-align: center;
  padding: var(--space-1) var(--space-2);
}

/* ── WhatsApp Status ── */
.wa-status-card { border-width: 2px; }

.wa-status-text {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.ready { background: #10b981; box-shadow: 0 0 6px #10b981; }
.status-dot.authenticated { background: #3b82f6; }
.status-dot.qr_pending { background: #f59e0b; animation: pulse 1.5s infinite; }
.status-dot.connecting { background: #f59e0b; animation: pulse 1s infinite; }
.status-dot.disconnected { background: #ef4444; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.wa-error {
  font-size: var(--text-xs);
  color: #ef4444;
  margin-top: var(--space-1);
}

.qr-display {
  margin-top: var(--space-4);
  text-align: center;
}

.qr-wrapper {
  display: inline-block;
  background: white;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.qr-image {
  width: 250px;
  height: 250px;
  display: block;
}

.qr-hint {
  margin-top: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.compact-btn {
  font-size: var(--text-sm);
  padding: var(--space-2) var(--space-4);
  gap: var(--space-2);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ── Toast ── */
.save-toast {
  position: fixed;
  bottom: var(--space-6);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  background: #10b981;
  color: white;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--text-sm);
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}

.save-toast.error { background: #ef4444; }

.toast-enter-active, .toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* ── Loading ── */
.loading-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.skeleton-card {
  height: 120px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.3; }
}
</style>
