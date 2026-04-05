<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '@/services/api'
import { gsap } from 'gsap'
import { Search } from 'lucide-vue-next'

interface Client {
  phone: string
  name: string
  deviceCount: number
  lastDate: string
}

const clients = ref<Client[]>([])
const isLoading = ref(true)
const searchQuery = ref('')

const filtered = computed(() => {
  if (!searchQuery.value) return clients.value
  const q = searchQuery.value.toLowerCase()
  return clients.value.filter(c =>
    c.name.toLowerCase().includes(q) || c.phone.includes(q)
  )
})

onMounted(async () => {
  try {
    const res = await api.get('/api/admin/clients')
    if (res.data.success) clients.value = res.data.data
  } catch { /* empty */ } finally {
    isLoading.value = false
    gsap.fromTo('.client-row',
      { opacity: 0, x: -10 },
      { opacity: 1, x: 0, duration: 0.2, stagger: 0.02 }
    )
  }
})
</script>

<template>
  <div class="clients-admin">
    <h1 class="page-title">إدارة العملاء</h1>

    <div class="toolbar card">
      <div class="search-wrapper">
        <Search :size="18" class="search-icon" />
        <input
          v-model="searchQuery"
          class="input"
          placeholder="ابحث باسم العميل أو المستفيد..."
          id="client-search"
        />
      </div>
      <span class="result-badge">{{ filtered.length }} عميل</span>
    </div>

    <div v-if="isLoading" class="table-loading">
      <div v-for="i in 6" :key="i" class="skeleton skeleton-text" style="height:44px;margin-bottom:4px"></div>
    </div>

    <div v-else class="table-wrapper card">
      <table class="sneat-table">
        <thead class="table-light">
          <tr>
            <th>اسم العميل</th>
            <th>رقم الهاتف</th>
            <th>إجمالي الأجهزة</th>
            <th>تاريخ آخر زيارة</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in filtered" :key="c.phone" class="client-row">
            <td class="name-cell">
              <div class="client-avatar-group">
                <div class="avatar bg-label-primary">{{ c.name.charAt(0) }}</div>
                <div class="client-name">{{ c.name }}</div>
              </div>
            </td>
            <td class="phone-cell" dir="ltr">{{ c.phone }}</td>
            <td><span class="badge bg-label-info">{{ c.deviceCount }} جهاز</span></td>
            <td class="date-cell">{{ c.lastDate }}</td>
          </tr>
          <tr v-if="filtered.length === 0">
            <td colspan="4" class="empty-row">لا توجد نتائج مطابقة للبحث</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.clients-admin { max-width: 1200px; }
.page-title { font-size: 1.375rem; font-weight: 600; color: #566a7f; margin-bottom: var(--space-6); }

.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; margin-bottom: var(--space-4); }

.search-wrapper { position: relative; width: 100%; max-width: 400px; display: flex; align-items: center; }
.search-icon { position: absolute; right: 1rem; color: #a1acb8; }
.search-wrapper .input { padding-right: 2.75rem; }

.result-badge { background: #e7e7ff; color: #696cff; font-weight: 600; padding: 0.35rem 0.8rem; border-radius: 0.375rem; font-size: 0.8125rem; }

.table-wrapper { padding: 0; overflow-x: auto; }
.table-light { background-color: #f9f9f9; }

.client-avatar-group { display: flex; align-items: center; gap: 0.75rem; }
.avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.875rem; flex-shrink: 0; }
.bg-label-primary { background-color: #e7e7ff; color: #696cff; }
.bg-label-info { background-color: #e1f0ff; color: #03c3ec; padding: 0.3rem 0.6rem; border-radius: 0.25rem; font-size: 0.8125rem; }

.client-name { font-weight: 600; color: #566a7f; }
.phone-cell { font-family: var(--font-latin); color: #697a8d; }
.date-cell { white-space: nowrap; font-size: 0.875rem; }
.empty-row { text-align: center; color: #a1acb8; padding: 3rem !important; }
.table-loading { display: flex; flex-direction: column; gap: var(--space-2); }
</style>
