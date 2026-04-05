import axios from 'axios'
import router from '@/router'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 15000,
  withCredentials: true, // Send httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

// Response interceptor — handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session expired
      localStorage.removeItem('hw_auth')
      localStorage.removeItem('hw_phone')
      localStorage.removeItem('hw_admin')
      router.push({ name: 'Home' })
    }
    return Promise.reject(error)
  }
)

export default api
