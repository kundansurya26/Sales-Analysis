import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/context/authStore'
import { useThemeStore } from '@/context/themeStore'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { SalesPage } from '@/pages/SalesPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { ForecastingPage } from '@/pages/ForecastingPage'
import { Spinner } from '@/components/ui'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, fetchMe } = useAuthStore()
  const { isDark } = useThemeStore()

  useEffect(() => {
    // Sync dark mode class
    document.documentElement.classList.toggle('dark', isDark)
    // Re-fetch user profile if we have a token but no user in store
    const token = localStorage.getItem('access_token')
    if (token && !isAuthenticated) {
      fetchMe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInitializer>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1f2937',
              color: '#f9fafb',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#f9fafb' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#f9fafb' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="sales"       element={<SalesPage />} />
            <Route path="products"    element={<ProductsPage />} />
            <Route path="customers"   element={<CustomersPage />} />
            <Route path="forecasting" element={<ForecastingPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppInitializer>
    </BrowserRouter>
  )
}
