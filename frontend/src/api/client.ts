import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach access token ──────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: auto-refresh on 401 ────────────────────────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)))
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        // No refresh token — force logout
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers!.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, {
          refresh_token: refreshToken,
        })
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        api.defaults.headers.common.Authorization = `Bearer ${data.access_token}`
        processQueue(null, data.access_token)
        originalRequest.headers!.Authorization = `Bearer ${data.access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Show a toast for non-auth errors
    const msg = (error.response?.data as any)?.detail ?? error.message
    if (error.response?.status !== 401) {
      toast.error(typeof msg === 'string' ? msg : 'An error occurred')
    }

    return Promise.reject(error)
  }
)

// ── Typed API helpers ─────────────────────────────────────────────────────────

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  refresh: (refreshToken: string) =>
    api.post('/api/auth/refresh', { refresh_token: refreshToken }),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me'),
}

export const dashboardAPI = {
  summary: (params?: { start_date?: string; end_date?: string }) =>
    api.get('/api/dashboard/summary', { params }),
}

export const analyticsAPI = {
  kpis: (params?: { start_date?: string; end_date?: string }) =>
    api.get('/api/analytics/kpis', { params }),
  monthlyRevenue: (months = 24) =>
    api.get('/api/analytics/monthly-revenue', { params: { months } }),
  topProducts: (params?: { limit?: number; start_date?: string; end_date?: string }) =>
    api.get('/api/analytics/top-products', { params }),
  regionPerformance: (params?: { start_date?: string; end_date?: string }) =>
    api.get('/api/analytics/region-performance', { params }),
  customerLTV: () => api.get('/api/analytics/customer-ltv'),
  forecast: (forecast_months = 3) =>
    api.get('/api/analytics/forecast', { params: { forecast_months } }),
  heatmap: () => api.get('/api/analytics/heatmap'),
  rfm: () => api.get('/api/analytics/rfm'),
  categoryPerformance: (params?: { start_date?: string; end_date?: string }) =>
    api.get('/api/analytics/category-performance', { params }),
}

export const salesAPI = {
  list: (params?: Record<string, unknown>) => api.get('/api/sales/', { params }),
  get: (id: number) => api.get(`/api/sales/${id}`),
  create: (data: unknown) => api.post('/api/sales/', data),
  update: (id: number, data: unknown) => api.patch(`/api/sales/${id}`, data),
  delete: (id: number) => api.delete(`/api/sales/${id}`),
  exportCSV: (params?: Record<string, unknown>) =>
    api.get('/api/sales/export/csv', { params, responseType: 'blob' }),
}

export const productsAPI = {
  list: (params?: Record<string, unknown>) => api.get('/api/products/', { params }),
  categories: () => api.get('/api/products/categories'),
  get: (id: number) => api.get(`/api/products/${id}`),
  create: (data: unknown) => api.post('/api/products/', data),
  update: (id: number, data: unknown) => api.patch(`/api/products/${id}`, data),
  delete: (id: number) => api.delete(`/api/products/${id}`),
}

export const customersAPI = {
  list: (params?: Record<string, unknown>) => api.get('/api/customers/', { params }),
  regions: () => api.get('/api/customers/regions'),
  get: (id: number) => api.get(`/api/customers/${id}`),
  create: (data: unknown) => api.post('/api/customers/', data),
  update: (id: number, data: unknown) => api.patch(`/api/customers/${id}`, data),
}
