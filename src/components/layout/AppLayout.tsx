import { useState, useCallback } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Menu, X, HardHat, LogOut } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useAuth } from '@/contexts/AuthContext'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()

  // Auto-logout after 15 minutes of inactivity
  const handleIdle = useCallback(async () => {
    await signOut()
    navigate('/login', { state: { reason: 'timeout' } })
  }, [signOut, navigate])

  useIdleTimeout(handleIdle, 15 * 60 * 1000)

  function closeSidebar() { setSidebarOpen(false) }

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── MOBILE OVERLAY ─────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── SIDEBAR ────────────────────────────────────── */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out',
        'lg:static lg:translate-x-0 lg:z-auto',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <Sidebar onClose={closeSidebar} />
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center h-14 px-4 bg-white border-b border-border shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2 ml-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary">
              <HardHat className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm">Mainza Maintenance</span>
          </div>
          <div className="ml-auto text-xs text-muted-foreground truncate max-w-24">
            {profile?.full_name?.split(' ')[0]}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
