<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import api from '@/services/api'
import { gsap } from 'gsap'
import { Search, QrCode, ScanBarcode, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-vue-next'
import DeviceQRPopup from '@/components/DeviceQRPopup.vue'
import QRScanner from '@/components/QRScanner.vue'

interface Device {
  rep_code: string
  rep_name: string
  rep_agent: string
  rep_date1: string
  rep_date2: string
  rep_defects: string
  rep_solution: string
  rep_amount: number
  displayStatus: string
  rep_tel: string
  rep_serial: string
  rep_emp: string
  rep_emp2: string
  rep_state: string
  rep_state2: string
  rep_case: string
  rep_memo: string
  rep_agent: string
  [key: string]: any
}

const devices = ref<Device[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const statusFilter = ref('all')
const sortField = ref('rep_date1')
const sortDir = ref<'asc' | 'desc'>('desc')
const classificationField = ref('rep_case')

// Pagination
const currentPage = ref(1)
const pageSize = 50
const totalItems = ref(0)
const totalPages = ref(0)

const statuses = ['all', 'قيد الفحص', 'قيد الإصلاح', 'انتظار موافقة', 'جاهز للاستلام', 'لا تصلح', 'إعاده توجيه', 'تم التسليم']
const statusCounts = ref<Record<string, number>>({})

async function fetchDevices() {
  isLoading.value = true
  try {
    const res = await api.get('/api/admin/devices', {
      params: {
        page: currentPage.value,
        limit: pageSize,
        search: searchQuery.value,
        status: statusFilter.value,
        sortBy: sortField.value,
        sortDir: sortDir.value
      }
    })
    
    if (res.data.success) {
      devices.value = res.data.data
      totalItems.value = res.data.pagination.total
      totalPages.value = res.data.pagination.totalPages
      statusCounts.value = res.data.statusCounts
      classificationField.value = res.data.classificationField || 'rep_case'
    }
  } catch (err) {
    console.error('Failed to fetch devices:', err)
  } finally {
    isLoading.value = false
    // Micro-animation for new rows
    setTimeout(() => {
      gsap.fromTo('.device-row',
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.2, stagger: 0.01 }
      )
    }, 50)
  }
}

onMounted(fetchDevices)

// Watchers for automatic re-fetching
watch([statusFilter, sortField, sortDir], () => {
  currentPage.value = 1
  fetchDevices()
})

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout>
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchDevices()
  }, 400)
})

function statusClass(status: string): string {
  const map: Record<string, string> = {
    'قيد الفحص': 'status-inspection',
    'قيد الإصلاح': 'status-repair',
    'انتظار موافقة': 'status-approval',
    'جاهز للاستلام': 'status-ready',
    'تم التسليم': 'status-delivered',
    'لا تصلح': 'status-unrepairable',
    'إعاده توجيه': 'status-redirect',
  }
  return map[status] || 'status-default'
}

function toggleSort(field: string) {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'desc'
  }
}

// QR Code Modal Logic
const showQRPopup = ref(false)
const qrDevice = ref<Device | null>(null)

function openQR(device: Device) {
  qrDevice.value = device
  showQRPopup.value = true
}

function closeQR() {
  showQRPopup.value = false
  qrDevice.value = null
}

// Edit Modal Logic
const editModalOpen = ref(false)
const editingDevice = ref<Device | null>(null)
const editForm = ref({ status: '', amount: 0 })
const isSaving = ref(false)

const availableStatuses = ['قيد الإصلاح', 'انتظار موافقة', 'جاهز للاستلام', 'لا تصلح', 'إعاده توجيه', 'تم التسليم']

function openEditModal(device: Device) {
  editingDevice.value = device
  editForm.value.status = device.displayStatus === 'قيد الفحص' ? 'قيد الإصلاح' : device.displayStatus
  editForm.value.amount = device.rep_amount || 0
  editModalOpen.value = true
}

function closeEditModal() {
  editModalOpen.value = false
  editingDevice.value = null
}

async function saveDeviceStatus() {
  if (!editingDevice.value) return
  isSaving.value = true
  
  try {
    if (editForm.value.status === 'انتظار موافقة') {
      const res = await api.post(`/api/admin/devices/${editingDevice.value.rep_code}/request-approval`, {
        amount: editForm.value.amount,
        reason: 'تم اكتشاف عطل إضافي أثناء الفحص - المرجو الموافقة على التكلفة المحدثة',
      })
      
      if (res.data.success) {
        editingDevice.value.displayStatus = editForm.value.status
        editingDevice.value.rep_amount = editForm.value.amount
        closeEditModal()
      } else {
        alert(res.data?.error || 'فشل في إرسال طلب الموافقة')
      }
    } else {
      let rep_state = 'لم يتم التسليم'
      let rep_state2 = ''
      
      switch (editForm.value.status) {
        case 'جاهز للاستلام': rep_state2 = 'تم الاصلاح'; break;
        case 'لا تصلح': rep_state2 = 'لا تصلح'; break;
        case 'إعاده توجيه': rep_state2 = 'إعاده توجيه'; break;
        case 'تم التسليم': rep_state = 'تم التسليم'; rep_state2 = editingDevice.value.rep_state2; break;
        case 'قيد الإصلاح': rep_state2 = ''; break;
      }

      const res = await api.put(`/api/admin/devices/${editingDevice.value.rep_code}/status`, {
        rep_state,
        rep_state2,
        rep_amount: editForm.value.amount
      })
      
      if (res.data.success) {
        editingDevice.value.displayStatus = editForm.value.status
        editingDevice.value.rep_amount = editForm.value.amount
        closeEditModal()
      } else {
        alert('فشل في تحديث الجهاز')
      }
    }
  } catch (err) {
    alert('حدث خطأ أثناء التحديث')
  } finally {
    isSaving.value = false
  }
}

async function quickStatus(device: Device, newStatus: string) {
  let rep_state = 'لم يتم التسليم'
  let rep_state2 = ''
  
  switch (newStatus) {
    case 'جاهز للاستلام': rep_state2 = 'تم الاصلاح'; break;
    case 'تم التسليم': rep_state = 'تم التسليم'; rep_state2 = device.rep_state2; break;
  }

  try {
    const res = await api.put(`/api/admin/devices/${device.rep_code}/status`, {
      rep_state,
      rep_state2,
      rep_amount: device.rep_amount
    })
    
    if (res.data.success) {
      device.displayStatus = newStatus
      device.rep_state = rep_state
      device.rep_state2 = rep_state2
    }
  } catch {
    alert('فشل في تحديث الحالة بسرعة')
  }
}

const showScanner = ref(false)
function onScanResult(decodedText: string) {
  let code = decodedText
  if (decodedText.includes('/device/')) {
    code = decodedText.split('/device/').pop() || decodedText
  }
  searchQuery.value = code
  showScanner.value = false
  const match = devices.value.find(d => d.rep_code === code)
  if (match) openEditModal(match)
}
</script>

<template>
  <div class="devices-admin">
    <div class="header-with-actions">
      <h1 class="page-title">إدارة الأجهزة</h1>
      <button class="btn btn-primary btn-icon" @click="showScanner = true">
        <ScanBarcode :size="18" /> امسح كود الموبايل
      </button>
    </div>

    <!-- Filters -->
    <div class="filters card">
      <div class="search-wrapper">
        <Search :size="18" class="search-icon" />
        <input
          v-model="searchQuery"
          class="input search-input"
          placeholder="ابحث بالكود، اسم العميل، أو الهاتف..."
          id="device-search"
        />
      </div>
      <div class="status-tabs">
        <button
          v-for="s in statuses"
          :key="s"
          class="status-tab"
          :class="{ active: statusFilter === s }"
          @click="statusFilter = s"
        >
          {{ s === 'all' ? 'الكل' : s }}
          <span v-if="s !== 'all' && statusCounts[s]" class="tab-count">{{ statusCounts[s] }}</span>
        </button>
      </div>
    </div>

    <!-- Results count -->
    <p class="results-count">{{ totalItems }} جهاز متوفر</p>

    <div class="table-container card">
      <div v-if="isLoading" class="table-loading-overlay">
        <div class="spinner"></div>
      </div>

      <div class="table-wrapper">
        <table class="sneat-table">
          <thead class="table-light">
            <tr>
              <th @click="toggleSort('rep_code')" class="sortable">
                الكود
                <ArrowUpDown v-if="sortField !== 'rep_code'" :size="14" class="sort-icon" />
                <component :is="sortDir === 'asc' ? ArrowUp : ArrowDown" v-else :size="14" class="sort-icon active" />
              </th>
              <th @click="toggleSort('rep_name')" class="sortable">
                العميل
                <ArrowUpDown v-if="sortField !== 'rep_name'" :size="14" class="sort-icon" />
                <component :is="sortDir === 'asc' ? ArrowUp : ArrowDown" v-else :size="14" class="sort-icon active" />
              </th>
              <th @click="toggleSort(classificationField)" class="sortable">
                التصنيف
                <ArrowUpDown v-if="sortField !== classificationField" :size="14" class="sort-icon" />
                <component :is="sortDir === 'asc' ? ArrowUp : ArrowDown" v-else :size="14" class="sort-icon active" />
              </th>
              <th>الحالة</th>
              <th @click="toggleSort('rep_date1')" class="sortable">
                تاريخ الاستلام
                <ArrowUpDown v-if="sortField !== 'rep_date1'" :size="14" class="sort-icon" />
                <component :is="sortDir === 'asc' ? ArrowUp : ArrowDown" v-else :size="14" class="sort-icon active" />
              </th>
              <th @click="toggleSort('rep_amount')" class="sortable">
                المبلغ
                <ArrowUpDown v-if="sortField !== 'rep_amount'" :size="14" class="sort-icon" />
                <component :is="sortDir === 'asc' ? ArrowUp : ArrowDown" v-else :size="14" class="sort-icon active" />
              </th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="d in devices"
              :key="d.rep_code"
              class="device-row"
            >
              <td class="code">{{ d.rep_code }}</td>
              <td>
                <div class="client-info">
                  <span class="client-name">{{ d.rep_name }}</span>
                  <span class="client-tel" dir="ltr">{{ d.rep_tel }}</span>
                </div>
              </td>
              <td class="category-cell">
                <span v-if="d[classificationField]" class="case-badge">{{ d[classificationField] }}</span>
                <span v-else class="text-muted text-xs">غير محدد</span>
              </td>
              <td>
                <span class="status-badge" :class="statusClass(d.displayStatus)">
                  {{ d.displayStatus }}
                </span>
              </td>
              <td class="date-cell">{{ d.rep_date1 }}</td>
              <td class="amount-cell number">{{ d.rep_amount || 0 }} ج.م</td>
              <td>
                <div class="actions-group">
                  <button
                    v-if="d.displayStatus === 'قيد الإصلاح' || d.displayStatus === 'قيد الفحص'"
                    class="btn btn-accent btn-sm"
                    @click.stop="quickStatus(d, 'جاهز للاستلام')"
                  >
                    جاهز
                  </button>
                  <button
                    v-if="d.displayStatus === 'جاهز للاستلام'"
                    class="btn btn-success btn-sm"
                    @click.stop="quickStatus(d, 'تم التسليم')"
                  >
                    تسليم
                  </button>
                  <button class="btn btn-outline btn-sm action-icon" @click.stop="openQR(d)" title="طباعة رمز QR">
                    <QrCode :size="16" />
                  </button>
                  <button class="btn btn-primary btn-sm" @click.stop="openEditModal(d)">تعديل</button>
                </div>
              </td>
            </tr>
            <tr v-if="devices.length === 0 && !isLoading">
              <td colspan="7" class="empty-row">لا توجد نتائج لهذا البحث أو الفلتر</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Server-Side Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <div class="pagination-info">
          عرض الصفحة {{ currentPage }} من {{ totalPages }} (إجمالي عدد النتائج: {{ totalItems }})
        </div>
        <div class="pagination-nav">
          <button class="btn btn-outline btn-sm prev-next" :disabled="currentPage === 1" @click="currentPage--; fetchDevices()">
            <ChevronRight :size="16" />
            السابق
          </button>
          
          <div class="page-numbers">
            <button 
              v-for="p in Math.min(5, totalPages)" 
              :key="p"
              class="page-btn"
              :class="{ active: currentPage === p }"
              @click="currentPage = p; fetchDevices()"
            >
              {{ p }}
            </button>
            <span v-if="totalPages > 5" class="dots">...</span>
            <button 
              v-if="totalPages > 5" 
              class="page-btn" 
              :class="{ active: currentPage === totalPages }"
              @click="currentPage = totalPages; fetchDevices()"
            >
              {{ totalPages }}
            </button>
          </div>

          <button class="btn btn-outline btn-sm prev-next" :disabled="currentPage === totalPages" @click="currentPage++; fetchDevices()">
            التالي
            <ChevronLeft :size="16" />
          </button>
        </div>
      </div>
    </div>

    <!-- QR Print Device Modal -->
    <DeviceQRPopup
      v-if="showQRPopup && qrDevice"
      :device-code="qrDevice.rep_code"
      :device-name="qrDevice.rep_name || qrDevice.rep_agent"
      @close="closeQR"
    />

    <!-- Edit Device Modal -->
    <div v-if="editModalOpen" class="modal-overlay" @click="closeEditModal">
      <div class="modal-body card" @click.stop>
        <h2>تعديل حالة الجهاز</h2>
        <p class="modal-subtitle">كود: <span class="code">{{ editingDevice?.rep_code }}</span> | العميل: {{ editingDevice?.rep_name }}</p>
        
        <div class="form-group">
          <label>الحالة الجديدة</label>
          <select v-model="editForm.status" class="input">
            <option v-for="s in availableStatuses" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>التكلفة النهائية (جنيه)</label>
          <input type="number" v-model="editForm.amount" class="input number" />
        </div>

        <div class="modal-actions">
          <button class="btn btn-outline" @click="closeEditModal" :disabled="isSaving">إلغاء</button>
          <button class="btn btn-primary" @click="saveDeviceStatus" :disabled="isSaving">
            <span v-if="isSaving">جاري الحفظ...</span>
            <span v-else>حفظ التعديلات</span>
          </button>
        </div>
      </div>
    </div>

    <!-- QR Scanner Modal -->
    <QRScanner v-if="showScanner" @close="showScanner = false" @scan="onScanResult" />
  </div>
</template>

<style scoped>
.devices-admin { max-width: 1400px; margin: 0 auto; padding: var(--space-4); }
.header-with-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6); wrap: flex-wrap; gap: var(--space-4); }
.page-title { font-size: 1.5rem; font-weight: 600; color: #566a7f; margin: 0; }
.btn-icon { display: flex; align-items: center; gap: var(--space-2); }

.table-container { position: relative; overflow: hidden; min-height: 400px; }
.table-loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(2px);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spinner { width: 40px; height: 40px; border: 4px solid rgba(105, 108, 255, 0.1); border-top-color: #696cff; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.filters { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: var(--space-4); margin-bottom: var(--space-4); }
.search-wrapper { position: relative; width: 100%; max-width: 500px; display: flex; align-items: center; }
.search-icon { position: absolute; right: 1rem; color: #a1acb8; }
.search-wrapper .input { padding-right: 2.75rem; border-radius: 8px; border: 1px solid #d9dee3; transition: all 0.2s; }
.search-wrapper .input:focus { border-color: #696cff; box-shadow: 0 0 0 0.2rem rgba(105, 108, 255, 0.25); }

.status-tabs { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.status-tab {
  padding: 0.4rem 1rem;
  border-radius: 50px;
  border: 1px solid #d9dee3;
  background: #f5f5f9;
  color: #697a8d;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}
.status-tab:hover { background: #e7e7ff; color: #696cff; border-color: #696cff; }
.status-tab.active { background: #696cff; color: #fff; border-color: #696cff; box-shadow: 0 2px 4px rgba(105, 108, 255, 0.4); }
.tab-count { font-size: 0.75rem; margin-inline-start: 6px; padding: 2px 6px; background: rgba(0,0,0,0.1); border-radius: 10px; }
.status-tab.active .tab-count { background: rgba(255,255,255,0.2); }

.results-count { font-size: 0.875rem; font-weight: 500; color: #697a8d; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px; }
.results-count::before { content: ''; width: 8px; height: 8px; background: #696cff; border-radius: 50%; }

.table-wrapper { width: 100%; }
.sneat-table { width: 100%; border-collapse: collapse; }
.sneat-table th { text-align: right; padding: 0.75rem 1.25rem; font-size: 0.75rem; text-transform: uppercase; color: #566a7f; border-bottom: 1px solid #d9dee3; }
.sneat-table td { padding: 1rem 1.25rem; border-bottom: 1px solid #d9dee3; vertical-align: middle; }
.sneat-table th.sortable { cursor: pointer; transition: color 0.2s; position: relative; }
.sneat-table th.sortable:hover { color: #696cff; }
.sort-icon { margin-inline-start: 4px; opacity: 0.3; transition: opacity 0.2s; }
.sort-icon.active { opacity: 1; color: #696cff; }

.client-info { display: flex; flex-direction: column; gap: 2px; }
.client-name { font-weight: 600; color: #566a7f; font-size: 0.9375rem; }
.client-tel { font-size: 0.8125rem; color: #a1acb8; font-family: monospace; letter-spacing: 0.5px; }

.case-badge {
  background: #f5f5f9;
  color: #697a8d;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge {
  padding: 0.35rem 0.65rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}
.status-inspection { background: #e7f3ff; color: #007bff; }
.status-repair { background: #fff2e0; color: #ffab00; }
.status-approval { background: #ffe0db; color: #ff3e1d; }
.status-ready { background: #e8fadf; color: #71dd37; }
.status-delivered { background: #eaebed; color: #8592a3; }
.status-unrepairable { background: #ffe0db; color: #ff3e1d; }
.status-redirect { background: #f3e8fd; color: #854dff; }

.amount-cell { font-weight: 600; color: #566a7f; font-family: monospace; }
.date-cell { font-size: 0.8125rem; color: #8592a3; white-space: nowrap; }

.actions-group { display: flex; gap: 8px; justify-content: flex-end; }
.action-icon { width: 34px; height: 34px; padding: 0; display: flex; align-items: center; justify-content: center; }

.pagination {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  gap: 1rem;
  border-top: 1px solid #d9dee3;
}
.pagination-info { font-size: 0.8125rem; color: #a1acb8; }
.pagination-nav { display: flex; gap: 1rem; align-items: center; }
.page-numbers { display: flex; gap: 0.5rem; align-items: center; }
.page-btn {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  border: 1px solid #d9dee3;
  background: #fff;
  color: #697a8d;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.page-btn:hover { background: #f5f5f9; border-color: #696cff; color: #696cff; }
.page-btn.active { background: #696cff; color: #fff; border-color: #696cff; }
.prev-next { display: flex; align-items: center; gap: 8px; padding: 0 1rem; height: 38px; }

/* Modal overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(67, 89, 113, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-body {
  width: 100%;
  max-width: 480px;
  padding: 2rem;
  animation: modalIn 0.3s ease-out;
}
@keyframes modalIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.875rem; color: #566a7f; }
.modal-actions { display: flex; gap: 1rem; margin-top: 2rem; }
.modal-actions .btn { flex: 1; }

.empty-row { text-align: center; color: #a1acb8; padding: 3rem !important; font-style: italic; }

@media (max-width: 991px) {
  .sneat-table th:nth-child(5), .sneat-table td:nth-child(5) { display: none; }
}
@media (max-width: 768px) {
  .pagination-nav { flex-direction: column; }
  .header-with-actions { flex-direction: column; align-items: flex-start; }
}
</style>
