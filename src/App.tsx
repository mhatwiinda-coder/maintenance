import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

// Auth pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

// Owner pages
import OwnerDashboard from '@/pages/owner/OwnerDashboard'
import AllWorkOrders from '@/pages/owner/AllWorkOrders'
import OwnerWorkOrderDetail from '@/pages/owner/WorkOrderDetail'
import ManageTechnicians from '@/pages/owner/ManageTechnicians'

// Client pages
import ClientDashboard from '@/pages/client/ClientDashboard'
import BookWork from '@/pages/client/BookWork'
import ClientWorkOrders from '@/pages/client/ClientWorkOrders'
import ClientWorkOrderDetail from '@/pages/client/ClientWorkOrderDetail'

// Technician pages
import TechnicianDashboard from '@/pages/technician/TechnicianDashboard'
import JobDetail from '@/pages/technician/JobDetail'
import CompletedJobs from '@/pages/technician/CompletedJobs'

import './App.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

/** Root redirect — sends logged-in users to their correct dashboard */
function RootRedirect() {
  const { user, role, loading } = useAuth()
  if (loading) return <LoadingSpinner fullPage />
  if (!user) return <Navigate to="/login" replace />
  if (role === 'owner') return <Navigate to="/owner" replace />
  if (role === 'technician') return <Navigate to="/technician" replace />
  return <Navigate to="/client" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Owner routes */}
            <Route element={<ProtectedRoute allowedRoles={['owner']}><AppLayout /></ProtectedRoute>}>
              <Route path="/owner" element={<OwnerDashboard />} />
              <Route path="/owner/work-orders" element={<AllWorkOrders />} />
              <Route path="/owner/work-orders/:id" element={<OwnerWorkOrderDetail />} />
              <Route path="/owner/technicians" element={<ManageTechnicians />} />
            </Route>

            {/* Client routes */}
            <Route element={<ProtectedRoute allowedRoles={['client']}><AppLayout /></ProtectedRoute>}>
              <Route path="/client" element={<ClientDashboard />} />
              <Route path="/client/book" element={<BookWork />} />
              <Route path="/client/work-orders" element={<ClientWorkOrders />} />
              <Route path="/client/work-orders/:id" element={<ClientWorkOrderDetail />} />
            </Route>

            {/* Technician routes */}
            <Route element={<ProtectedRoute allowedRoles={['technician']}><AppLayout /></ProtectedRoute>}>
              <Route path="/technician" element={<TechnicianDashboard />} />
              <Route path="/technician/jobs/:id" element={<JobDetail />} />
              <Route path="/technician/completed" element={<CompletedJobs />} />
            </Route>

            {/* Root & 404 */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
