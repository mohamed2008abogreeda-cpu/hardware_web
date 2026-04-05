<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { 
  Menu, LayoutDashboard, Laptop, Users, MessageSquare, 
  Bell, FileText, Settings, Activity, ClipboardList,
  Sun, Moon, X, LogOut
} from 'lucide-vue-next'
import { useDarkMode } from '@/composables/useDarkMode'
import { gsap } from 'gsap'

const { isDark, toggle } = useDarkMode()
const auth = useAuthStore()
const router = useRouter()

const isDrawerOpen = ref(false)

async function handleLogout() {
  await auth.adminLogout()
  router.push({ name: 'AdminLogin' })
}

const toggleDrawer = () => {
  isDrawerOpen.value = !isDrawerOpen.value;
  if (isDrawerOpen.value) {
    // Wait for DOM
    setTimeout(() => {
      gsap.fromTo('.drawer-content', { x: '100%' }, { x: '0%', duration: 0.3, ease: 'power2.out' });
      gsap.fromTo('.drawer-overlay', { opacity: 0 }, { opacity: 1, duration: 0.3 });
    }, 10);
  }
}

const closeDrawer = () => {
  gsap.to('.drawer-content', { x: '100%', duration: 0.2, ease: 'power2.in' });
  gsap.to('.drawer-overlay', { opacity: 0, duration: 0.2, onComplete: () => { isDrawerOpen.value = false; } });
}

// Quick access for Bottom Navigation
const allBottomNavItems = [
  { name: 'AdminDashboard', label: 'الرئيسية', icon: LayoutDashboard, roles: ['admin', 'tech', 'viewer'] },
  { name: 'AdminDevices', label: 'الأجهزة', icon: Laptop, roles: ['admin', 'tech', 'viewer'] },
  { name: 'AdminChat', label: 'المحادثات', icon: MessageSquare, roles: ['admin', 'tech'] },
  { name: 'AdminSettings', label: 'الإعدادات', icon: Settings, roles: ['admin'] },
]

const bottomNavItems = computed(() => {
  const role = auth.adminRole || 'viewer'
  return allBottomNavItems.filter(item => item.roles.includes(role))
})

// All items for the Drawer Menu
const allDrawerItems = [
  { name: 'AdminClients', label: 'العملاء', icon: Users, roles: ['admin', 'tech'] },
  { name: 'AdminNotifications', label: 'الإشعارات', icon: Bell, roles: ['admin', 'tech'] },
  { name: 'AdminReports', label: 'التقارير', icon: FileText, roles: ['admin'] },
  { name: 'AdminUsers', label: 'المشرفين والموظفين', icon: Users, roles: ['admin'] },
  { name: 'AdminHealth', label: 'صحة النظام', icon: Activity, roles: ['admin'] },
  { name: 'AdminLogs', label: 'السجلات', icon: ClipboardList, roles: ['admin'] },
]

const drawerItems = computed(() => {
  const role = auth.adminRole || 'viewer'
  return allDrawerItems.filter(item => item.roles.includes(role))
})
</script>

<template>
  <div class="mobile-admin-layout admin-theme">
    
    <!-- Top App Bar -->
    <header class="mobile-header">
      <div class="header-left">
        <button class="icon-btn theme-btn" @click="toggle" aria-label="Toggle Dark Mode">
          <Moon v-if="!isDark" :size="20" />
          <Sun v-else :size="20" />
        </button>
      </div>
      <div class="header-title">
        <img src="/logo.png" alt="هارد وير" class="logo-img" />
        <span>هارد وير</span>
      </div>
      <div class="header-right">
        <button class="icon-btn menu-btn" @click="toggleDrawer" aria-label="Menu">
          <Menu :size="24" />
        </button>
      </div>
    </header>

    <!-- Main Router View (Scrollable area) -->
    <main class="mobile-content">
      <RouterView />
    </main>

    <!-- Bottom Navigation Bar -->
    <nav class="bottom-nav">
      <RouterLink
        v-for="item in bottomNavItems"
        :key="item.name"
        :to="{ name: item.name }"
        class="nav-item"
        active-class="active"
      >
        <component :is="item.icon" :size="22" class="nav-icon" />
        <span class="nav-label">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <!-- Off-Canvas Drawer -->
    <teleport to="body">
      <div v-if="isDrawerOpen" class="drawer-wrapper admin-theme">
        <div class="drawer-overlay" @click="closeDrawer"></div>
        <div class="drawer-content">
          <div class="drawer-header">
            <div class="admin-profile">
              <div class="avatar">A</div>
              <div class="info">
                <div class="name">مدير النظام</div>
                <div class="role">{{ auth.adminRole }}</div>
              </div>
            </div>
            <button class="icon-btn close-drawer" @click="closeDrawer">
              <X :size="24" />
            </button>
          </div>
          
          <div class="drawer-body">
            <h4 class="drawer-title">المزيد من الخيارات</h4>
            <div class="drawer-menu">
              <RouterLink
                v-for="item in drawerItems"
                :key="item.name"
                :to="{ name: item.name }"
                class="drawer-link"
                active-class="active"
                @click="closeDrawer"
              >
                <component :is="item.icon" :size="20" class="drawer-icon" />
                <span class="drawer-label">{{ item.label }}</span>
              </RouterLink>
            </div>
          </div>

          <div class="drawer-footer">
            <button class="logout-btn" @click="handleLogout">
              <LogOut :size="20" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </div>
    </teleport>

  </div>
</template>

<style scoped>
.mobile-admin-layout {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  /* 100dvh is useful on mobile to exclude browser UI space dynamically */
  background-color: var(--color-bg);
  overflow: hidden;
}

/* ── Top Header ── */
.mobile-header {
  height: 60px;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  flex-shrink: 0;
  z-index: 10;
}

.header-left, .header-right {
  display: flex;
  align-items: center;
  width: 48px; /* Fixed width for flex balance */
}

.header-right {
  justify-content: flex-end;
}

.header-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 700;
  font-size: 1.15rem;
  color: var(--color-text);
  letter-spacing: -0.5px;
}

.logo-img {
  width: 34px;
  height: 34px;
  object-fit: contain;
  border-radius: var(--radius-sm);
}

.icon-btn {
  background: transparent;
  border: none;
  color: var(--color-text);
  padding: var(--space-2);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Content Area ── */
.mobile-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-4) var(--space-3);
  padding-bottom: calc(var(--space-8) + 10px); /* extra space before bottom nav */
  -webkit-overflow-scrolling: touch;
}

/* ── Bottom Navigation ── */
.bottom-nav {
  height: 65px;
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom);
  flex-shrink: 0;
  z-index: 10;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.03);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  height: 100%;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav-icon {
  margin-bottom: 2px;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.nav-label {
  font-size: 0.65rem;
  font-weight: 600;
}

.nav-item.active {
  color: var(--color-primary);
}

.nav-item.active .nav-icon {
  transform: translateY(-2px);
}

/* ── Off-Canvas Drawer ── */
.drawer-wrapper {
  position: fixed;
  inset: 0;
  z-index: 9999; /* Over everything */
  pointer-events: none;
}

.drawer-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  pointer-events: auto;
  opacity: 0; 
}

.drawer-content {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 280px;
  max-width: 85vw;
  background-color: var(--color-surface);
  box-shadow: -4px 0 24px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  transform: translateX(100%); /* RTL hides to the right */
}

/* Force dark mode scoping if needed inside teleport */
.drawer-wrapper.dark {
  color-scheme: dark;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-6) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.admin-profile {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.avatar {
  width: 40px;
  height: 40px;
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.1rem;
}

.name {
  font-weight: 700;
  color: var(--color-text);
  font-size: 0.95rem;
}

.role {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4) 0;
}

.drawer-title {
  padding: 0 var(--space-4);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  margin-bottom: var(--space-2);
}

.drawer-menu {
  display: flex;
  flex-direction: column;
}

.drawer-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  color: var(--color-text);
  text-decoration: none;
  transition: background 0.15s ease;
}

.drawer-link:hover {
  background-color: var(--color-surface-2);
}

.drawer-link.active {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
  border-inline-end: 3px solid var(--color-primary);
}

.drawer-icon {
  color: currentColor;
}

.drawer-footer {
  padding: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-3);
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  justify-content: center;
}
</style>
