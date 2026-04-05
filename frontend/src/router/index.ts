import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePostHog } from '@/composables/usePostHog'

const routes: RouteRecordRaw[] = [
  // ══════════════════════════════════
  // Customer Routes
  // ══════════════════════════════════
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: 'Hardware — تابع جهازك' },
  },
  {
    path: '/otp',
    name: 'OtpInput',
    component: () => import('@/views/OtpInput.vue'),
    meta: { title: 'تأكيد رمز التحقق', requiresPhone: true },
  },
  {
    path: '/track',
    name: 'Track',
    component: () => import('@/views/Track.vue'),
    meta: { title: 'أجهزتي', requiresAuth: true },
  },
  {
    path: '/device/:code',
    name: 'DeviceDetails',
    component: () => import('@/views/DeviceDetails.vue'),
    meta: { title: 'تفاصيل الجهاز' },
    props: true,
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { title: 'حسابي', requiresAuth: true },
  },
  {
    path: '/chat/:code',
    name: 'CustomerChat',
    component: () => import('@/views/CustomerChat.vue'),
    meta: { title: 'المحادثة والدعم', requiresAuth: true },
    props: true,
  },
  {
    path: '/kiosk',
    name: 'Kiosk',
    component: () => import('@/views/Kiosk.vue'),
    meta: { title: 'إدخال كود الاستلام' },
  },
  {
    path: '/share/:token',
    name: 'Share',
    component: () => import('@/views/Share.vue'),
    meta: { title: 'عرض حالة الجهاز' },
    props: true,
  },
  {
    path: '/approval/:token',
    name: 'Approval',
    component: () => import('@/views/Approval.vue'),
    meta: { title: 'طلب موافقة' },
    props: true,
  },
  {
    path: '/rating/:deviceCode',
    name: 'Rating',
    component: () => import('@/views/Rating.vue'),
    meta: { title: 'تقييم الخدمة' },
    props: true,
  },

  // ══════════════════════════════════
  // Admin Routes
  // ══════════════════════════════════
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('@/views/admin/Login.vue'),
    meta: { title: 'دخول الإدارة' },
  },
  {
    path: '/admin',
    name: 'AdminLayout',
    component: () => import('@/views/admin/AdminLayout.vue'),
    meta: { requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/Dashboard.vue'),
        meta: { title: 'لوحة التحكم' },
      },
      {
        path: 'devices',
        name: 'AdminDevices',
        component: () => import('@/views/admin/Devices.vue'),
        meta: { title: 'إدارة الأجهزة', allowedRoles: ['admin', 'tech', 'viewer'] },
      },
      {
        path: 'clients',
        name: 'AdminClients',
        component: () => import('@/views/admin/Clients.vue'),
        meta: { title: 'إدارة العملاء', allowedRoles: ['admin', 'tech'] },
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/Users.vue'),
        meta: { title: 'المستخدمين والصلاحيات', allowedRoles: ['admin'] },
      },
      {
        path: 'chat',
        name: 'AdminChat',
        component: () => import('@/views/admin/Chat.vue'),
        meta: { title: 'المحادثات', allowedRoles: ['admin', 'tech'] },
      },
      {
        path: 'notifications',
        name: 'AdminNotifications',
        component: () => import('@/views/admin/Notifications.vue'),
        meta: { title: 'الإشعارات', allowedRoles: ['admin', 'tech'] },
      },
      {
        path: 'reports',
        name: 'AdminReports',
        component: () => import('@/views/admin/Reports.vue'),
        meta: { title: 'التقارير', allowedRoles: ['admin'] },
      },
      {
        path: 'settings',
        name: 'AdminSettings',
        component: () => import('@/views/admin/Settings.vue'),
        meta: { title: 'الإعدادات', allowedRoles: ['admin'] },
      },
      {
        path: 'health',
        name: 'AdminHealth',
        component: () => import('@/views/admin/Health.vue'),
        meta: { title: 'صحة النظام', allowedRoles: ['admin'] },
      },
      {
        path: 'logs',
        name: 'AdminLogs',
        component: () => import('@/views/admin/Logs.vue'),
        meta: { title: 'سجلات النظام', allowedRoles: ['admin'] },
      },
    ],
  },

  // ══════════════════════════════════
  // Error Pages
  // ══════════════════════════════════
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: 'الصفحة غير موجودة' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition || { top: 0 }
  },
})

// Navigation guards — seamless auth flow
router.beforeEach((to, _from, next) => {
  // Update page title
  if (to.meta.title) {
    document.title = to.meta.title as string
  }

  const auth = useAuthStore()

  // If user is authenticated and visiting Home → redirect to Track
  if (to.name === 'Home' && auth.isAuthenticated) {
    next({ name: 'Track' })
    return
  }

  // Pages requiring OTP phone (must have pendingPhone)
  if (to.meta.requiresPhone && !auth.pendingPhone) {
    next({ name: 'Home' })
    return
  }

  // Pages requiring customer auth
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next({ name: 'Home' })
    return
  }

  // Admin pages — check entire matched route chain (parent + child)
  const requiresAdmin = to.matched.some(r => r.meta.requiresAdmin)
  if (requiresAdmin && !auth.isAdmin) {
    next({ name: 'AdminLogin' })
    return
  }
  
  // Specific role checks for sub-pages
  const allowedRoles = to.meta.allowedRoles as string[] | undefined
  if (allowedRoles && !allowedRoles.includes(auth.adminRole || 'viewer')) {
    next({ name: 'AdminDashboard' })
    return
  }

  // Admin login — redirect to dashboard if already logged in
  if (to.name === 'AdminLogin' && auth.isAdmin) {
    next({ name: 'AdminDashboard' })
    return
  }

  next()
})

// Handle chunk load errors (new deployment)
router.onError((err) => {
  if (err.name === 'ChunkLoadError') {
    window.location.reload()
  }
})

// Initialize PostHog before exporting
usePostHog()

export default router
