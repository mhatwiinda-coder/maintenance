import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, Users, PlusCircle,
  LogOut, HardHat, ChevronRight, Building2, Wrench, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const ownerLinks = [
  { to: '/owner',             label: 'Dashboard',       icon: LayoutDashboard, end: true },
  { to: '/owner/work-orders', label: 'All Work Orders',  icon: ClipboardList },
  { to: '/owner/companies',   label: 'Companies',        icon: Building2 },
  { to: '/owner/clients',     label: 'Clients',          icon: Users },
  { to: '/owner/technicians', label: 'Technicians',      icon: Wrench },
]

const clientLinks = [
  { to: '/client',             label: 'Dashboard',       icon: LayoutDashboard, end: true },
  { to: '/client/book',        label: 'Book New Work',   icon: PlusCircle },
  { to: '/client/work-orders', label: 'My Work Orders',  icon: ClipboardList },
]

const technicianLinks = [
  { to: '/technician',           label: 'My Jobs',        icon: LayoutDashboard, end: true },
  { to: '/technician/completed', label: 'Completed Jobs', icon: ClipboardList },
]

const roleLabels = { owner: 'Owner', client: 'Client', technician: 'Technician' }
const roleColors = {
  owner:      'bg-amber-100 text-amber-800',
  client:     'bg-blue-100  text-blue-800',
  technician: 'bg-green-100 text-green-800',
}

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()

  const links =
    role === 'owner'      ? ownerLinks
    : role === 'client'   ? clientLinks
    : technicianLinks

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '??'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  function handleNavClick() {
    onClose?.() // close drawer on mobile after navigating
  }

  return (
    <aside className="flex flex-col w-64 h-full min-h-screen bg-white border-r border-border shrink-0">

      {/* Brand + mobile close button */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary shrink-0">
          <HardHat className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground leading-none">ZAI</p>
          <p className="text-xs text-muted-foreground leading-none mt-0.5">Maintenance</p>
        </div>
        {/* Close button — only visible on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Separator />

      {/* Role chip */}
      <div className="px-4 py-3">
        <span className={cn(
          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
          role ? roleColors[role] : 'bg-muted text-muted-foreground'
        )}>
          {role ? roleLabels[role] : 'Unknown role'}
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={handleNavClick}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <Separator />

      {/* User footer */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name ?? 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{role}</p>
          </div>
        </div>
        <Button
          variant="ghost" size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
