<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { 
  LayoutDashboard, Laptop, Users, MessageSquare, 
  Bell, FileText, Settings, Activity, ClipboardList, Search,
  Sun, Moon
} from 'lucide-vue-next'
import { useDarkMode } from '@/composables/useDarkMode'

const { isDark, toggle } = useDarkMode()
const auth = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await auth.adminLogout()
  router.push({ name: 'AdminLogin' })
}

const allItems = [
  { name: 'AdminDashboard', label: 'لوحة التحكم', icon: LayoutDashboard, roles: ['admin', 'tech', 'viewer'] },
  { name: 'AdminDevices', label: 'الأجهزة', icon: Laptop, roles: ['admin', 'tech', 'viewer'] },
  { name: 'AdminClients', label: 'العملاء', icon: Users, roles: ['admin', 'tech'] },
  { name: 'AdminChat', label: 'المحادثات', icon: MessageSquare, roles: ['admin', 'tech'] },
  { name: 'AdminNotifications', label: 'الإشعارات', icon: Bell, roles: ['admin', 'tech'] },
  { name: 'AdminReports', label: 'التقارير', icon: FileText, roles: ['admin'] },
  { name: 'AdminUsers', label: 'المشرفين والموظفين', icon: Users, roles: ['admin'] },
  { name: 'AdminSettings', label: 'الإعدادات', icon: Settings, roles: ['admin'] },
  { name: 'AdminHealth', label: 'صحة النظام', icon: Activity, roles: ['admin'] },
  { name: 'AdminLogs', label: 'السجلات', icon: ClipboardList, roles: ['admin'] },
]

const navItems = computed(() => {
  const role = auth.adminRole || 'viewer'
  return allItems.filter(item => item.roles.includes(role))
})
</script>

<template>
  <div class="admin-layout admin-theme">
    <!-- Sidebar -->
    <aside class="sneat-sidebar">
      <div class="sidebar-header">
        <img src="/logo.png" alt="هارد وير" class="sidebar-logo-img" />
        <span class="sidebar-title">هارد وير</span>
      </div>

      <nav class="sidebar-nav">
        <ul class="menu-inner">
          <li class="menu-item" v-for="item in navItems" :key="item.name">
            <RouterLink
              :to="{ name: item.name }"
              class="menu-link"
              active-class="active"
            >
              <component :is="item.icon" class="menu-icon" :size="20" />
              <span class="menu-label">{{ item.label }}</span>
            </RouterLink>
          </li>
        </ul>
      </nav>
    </aside>

    <!-- Page Layout Wrapper -->
    <div class="sneat-layout-page">
      <!-- Navbar -->
      <nav class="sneat-navbar">
        <div class="navbar-nav-right">
          <div class="nav-search">
            <Search :size="20" class="search-icon" />
            <input type="text" placeholder="بحث..." class="search-input" />
          </div>
          <div class="nav-actions">
             <button class="btn btn-ghost theme-toggle" @click="toggle" aria-label="Toggle Dark Mode" title="تغيير المظهر">
                <Sun v-if="!isDark" :size="20" />
                <Moon v-else :size="20" />
             </button>
             <button class="btn btn-ghost settings-shortcut" @click="router.push({ name: 'AdminSettings' })" aria-label="Settings" title="الإعدادات">
                <Settings :size="20" />
             </button>
             <div class="avatar-circle">A</div>
             <button class="btn btn-ghost logout-btn" @click="handleLogout" id="admin-logout">
               تسجيل الخروج
             </button>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <div class="sneat-content-wrapper">
        <main class="sneat-main">
          <RouterView />
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background-color: var(--color-bg); /* #f5f5f9 */
}

/* ── SNEAT SIDEBAR ── */
.sneat-sidebar {
  width: 260px;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: var(--space-4);
  bottom: var(--space-4);
  right: var(--space-4);
  z-index: 1038;
  overflow: hidden;
}

.sidebar-header {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  margin-top: var(--space-2);
  gap: var(--space-2);
}

.sidebar-logo-img {
  width: 38px;
  height: 38px;
  object-fit: contain;
  border-radius: var(--radius-md);
}

.sidebar-title {
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--color-text);
  letter-spacing: -0.5px;
  font-family: var(--font-arabic);
}

.sidebar-brand-4 {
  color: var(--color-magenta, #A82C6A);
  font-family: var(--font-latin);
  font-weight: 900;
}

.sidebar-nav {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  overflow-y: auto;
}

.menu-inner {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.menu-item {
  margin-bottom: 0px;
}

.menu-link {
  display: flex;
  align-items: center;
  padding: 0.625rem 1rem;
  border-radius: var(--radius-md);
  color: var(--color-text);
  text-decoration: none;
  transition: all 0.15s ease;
}

.menu-link:hover {
  background-color: rgba(67, 89, 113, 0.04);
  color: var(--color-text);
}

.menu-link.active {
  background-color: var(--color-primary-light); /* #e7e7ff */
  color: var(--color-primary);
  font-weight: 600;
}

.menu-icon {
  font-size: 1.25rem;
  margin-inline-end: 0.5rem;
}

.menu-label {
  font-size: 0.9375rem;
}

/* ── PAGE LAYOUT ── */
.sneat-layout-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding-inline-start: calc(260px + var(--space-6)); /* Sidebar width + gap */
}

/* ── SNEAT NAVBAR ── */
.sneat-navbar {
  height: 64px;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  margin: var(--space-4);
  margin-bottom: 0;
  padding: 0 var(--space-4);
  box-shadow: var(--shadow-md);
  display: flex;
  align-items: center;
  z-index: 1020;
}

.navbar-nav-right {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.search-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.9375rem;
  color: var(--color-text);
  width: 250px;
  font-family: inherit;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.avatar-circle {
  width: 38px;
  height: 38px;
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: 50%;
  border: 2px solid var(--color-surface);
  box-shadow: 0 0 0 1px var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.theme-toggle, .settings-shortcut {
  color: var(--color-text-muted);
  padding: var(--space-2);
}
.theme-toggle:hover, .settings-shortcut:hover {
  color: var(--color-primary);
  background: var(--color-surface-2);
}

.logout-btn {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}
.logout-btn:hover {
  color: #ff3e1d;
  background: rgba(255, 62, 29, 0.1);
}

/* ── SNEAT CONTENT ── */
.sneat-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.sneat-main {
  flex: 1;
  padding: var(--space-6) var(--space-4);
  width: 100%;
}

/* Desktop Sidebar - No overflow on body, allow navigation scrolling */
.sidebar-nav {
  scrollbar-width: thin;
  scrollbar-color: var(--color-primary) transparent;
}
</style>
