<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PlusCircle, Pencil, Trash2, Shield, Eye, Settings } from 'lucide-vue-next'
import api from '@/services/api'

interface User {
  id: number
  username: string
  name: string
  role: 'admin' | 'tech' | 'viewer'
  is_active: number
  created_at: string
}

const users = ref<User[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)

const showAddModal = ref(false)
const showEditModal = ref(false)
const errorMsg = ref('')

// Form state
const form = ref({ id: 0, username: '', password: '', name: '', role: 'tech', is_active: 1 })

async function fetchUsers() {
  isLoading.value = true
  try {
    const res = await api.get('/api/admin/users')
    if (res.data.success) {
      users.value = res.data.data
    }
  } catch (err) {
    console.error('Failed to fetch users', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchUsers()
})

function openAddModal() {
  form.value = { id: 0, username: '', password: '', name: '', role: 'tech', is_active: 1 }
  errorMsg.value = ''
  showAddModal.value = true
}

function openEditModal(user: User) {
  form.value = { id: user.id, username: user.username, password: '', name: user.name, role: user.role, is_active: user.is_active }
  errorMsg.value = ''
  showEditModal.value = true
}

async function handleAdd() {
  if (!form.value.username || !form.value.password || !form.value.name) {
    errorMsg.value = 'الرجاء إدخال اسم المستخدم وكلمة المرور والاسم';
    return;
  }
  isSubmitting.value = true
  errorMsg.value = ''
  try {
    const res = await api.post('/api/admin/users', form.value)
    if (res.data.success) {
      showAddModal.value = false
      fetchUsers()
    }
  } catch (err: any) {
    errorMsg.value = err.response?.data?.error || 'حدث خطأ غير معروف'
  } finally {
    isSubmitting.value = false
  }
}

async function handleEdit() {
  isSubmitting.value = true
  errorMsg.value = ''
  try {
    const res = await api.put(`/api/admin/users/${form.value.id}`, { role: form.value.role, is_active: form.value.is_active })
    if (res.data.success) {
      showEditModal.value = false
      fetchUsers()
    }
  } catch (err: any) {
    errorMsg.value = err.response?.data?.error || 'حدث خطأ غير معروف'
  } finally {
    isSubmitting.value = false
  }
}

async function deleteUser(id: number) {
  if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return
  await api.delete(`/api/admin/users/${id}`)
  fetchUsers()
}

const roleMap = {
  admin: { label: 'مدير النظام', icon: Settings },
  tech: { label: 'فني', icon: Shield },
  viewer: { label: 'مشاهد', icon: Eye }
}
</script>

<template>
  <div class="admin-users">
    <div class="page-header">
      <h1 class="page-title">إدارة المستخدمين</h1>
      <button class="btn btn-primary" @click="openAddModal">
        <PlusCircle :size="18" /> إضافة مستخدم
      </button>
    </div>

    <div class="card table-wrapper">
      <table v-if="!isLoading" class="sneat-table">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>اسم المستخدم</th>
            <th>الصلاحية</th>
            <th>الحالة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td><strong>{{ user.name }}</strong></td>
            <td dir="ltr" style="text-align:right">{{ user.username }}</td>
            <td>
              <span class="role-badge" :data-role="user.role">
                <component :is="roleMap[user.role].icon" :size="14" />
                {{ roleMap[user.role].label }}
              </span>
            </td>
            <td>
               <span class="status-badge" :data-status="user.is_active ? 'جاهز للاستلام' : 'مرفوض'">
                 {{ user.is_active ? 'نشط' : 'موقوف' }}
               </span>
            </td>
            <td>
              <div class="actions">
                <button class="icon-btn edit-btn" @click="openEditModal(user)" title="تعديل">
                  <Pencil :size="16" />
                </button>
                <button class="icon-btn delete-btn" @click="deleteUser(user.id)" title="حذف">
                  <Trash2 :size="16" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="5" class="empty-state">لا يوجد مستخدمين مسجلين بعد</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="loading-state">جاري التحميل...</div>
    </div>

    <!-- Modals -->
    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click="showAddModal = false; showEditModal = false">
      <div class="modal-content card" @click.stop>
        <h2>{{ showAddModal ? 'إضافة مستخدم جديد' : 'تعديل المستخدم' }}</h2>
        
        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

        <form @submit.prevent="showAddModal ? handleAdd() : handleEdit()" class="user-form">
          <template v-if="showAddModal">
            <div class="form-group">
               <label>الاسم بالكامل</label>
               <input v-model="form.name" type="text" class="input" required />
            </div>
            <div class="form-group">
               <label>اسم المستخدم (للدخول)</label>
               <input v-model="form.username" type="text" class="input" required dir="ltr" />
            </div>
            <div class="form-group">
               <label>كلمة المرور</label>
               <input v-model="form.password" type="password" class="input" required dir="ltr" />
            </div>
          </template>

          <template v-if="showEditModal">
            <div class="form-group">
               <label>الاسم</label>
               <input :value="form.name" type="text" class="input disabled" disabled />
            </div>
          </template>

          <div class="form-group">
             <label>الصلاحية</label>
             <select v-model="form.role" class="input">
               <option value="admin">مدير النظام (Admin)</option>
               <option value="tech">فني (Tech)</option>
               <option value="viewer">مشاهد (Viewer)</option>
             </select>
          </div>

          <div class="form-group" v-if="showEditModal">
             <label>الحالة</label>
             <select v-model="form.is_active" class="input">
               <option :value="1">نشط</option>
               <option :value="0">موقوف</option>
             </select>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-ghost" @click="showAddModal = false; showEditModal = false">إلغاء</button>
            <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
              {{ isSubmitting ? 'جاري الحفظ...' : 'حفظ' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
}
.page-title { margin: 0; font-size: var(--text-2xl); font-weight: 700; color: var(--color-primary); }

.table-wrapper { overflow-x: auto; padding: 0; }
.actions { display: flex; gap: var(--space-2); }
.icon-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: var(--radius-md); border: none; cursor: pointer; transition: all 0.2s; background: transparent; }
.edit-btn { color: var(--color-accent); }
.edit-btn:hover { background: rgba(197, 160, 89, 0.1); }
.delete-btn { color: #EF4444; }
.delete-btn:hover { background: rgba(239, 68, 68, 0.1); }

.role-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; background: var(--color-surface-2); color: var(--color-text); }
.empty-state, .loading-state { text-align: center; padding: var(--space-8); color: var(--color-text-muted); }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
.modal-content { width: 100%; max-width: 450px; padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4); animation: slideUp 0.3s ease; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.user-form { display: flex; flex-direction: column; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-group label { font-size: var(--text-sm); font-weight: 600; }
.disabled { background: var(--color-surface-2); color: var(--color-text-muted); }

.form-actions { display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-4); }
.error-msg { padding: 12px; background: rgba(239, 68, 68, 0.1); color: #EF4444; border-radius: 6px; font-size: 0.9rem; }
</style>
