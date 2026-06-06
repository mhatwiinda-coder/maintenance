import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Clock, CheckCircle2, XCircle, Loader2, ArrowRight, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { formatDate, timeAgo } from '@/lib/utils'
import type { WorkOrder } from '@/lib/database.types'

interface Stats {
  total: number
  pending: number
  inProgress: number
  completed: number
}

export default function OwnerDashboard() {
  const { profile } = useAuth()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, inProgress: 0, completed: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()

    // Real-time subscription
    const channel = supabase
      .channel('owner-work-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, () => fetchData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('work_orders')
      .select('*, client:profiles!client_id(full_name, phone), technician:profiles!technician_id(full_name)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      setWorkOrders(data as WorkOrder[])
      setStats({
        total: data.length,
        pending: data.filter(w => w.status === 'pending').length,
        inProgress: data.filter(w => ['accepted','assigned','in_progress'].includes(w.status)).length,
        completed: data.filter(w => w.status === 'completed').length,
      })
    }
    setLoading(false)
  }

  const recent = workOrders.slice(0, 8)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Owner Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back, {profile?.full_name}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700">Pending Review</p>
                <p className="text-3xl font-bold mt-1 text-amber-800">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">In Progress</p>
                <p className="text-3xl font-bold mt-1 text-blue-800">{stats.inProgress}</p>
              </div>
              <Loader2 className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Completed</p>
                <p className="text-3xl font-bold mt-1 text-green-800">{stats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Work Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Work Orders</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/owner/work-orders">
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <XCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No work orders yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {recent.map((wo) => (
                <Link
                  key={wo.id}
                  to={`/owner/work-orders/${wo.id}`}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-muted/40 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{wo.title}</p>
                      <StatusBadge status={wo.status} />
                      <PriorityBadge priority={wo.priority} />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {(wo.client as { full_name?: string })?.full_name ?? 'Unknown client'}
                      </span>
                      <span className="text-xs text-muted-foreground">{timeAgo(wo.created_at)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {formatDate(wo.preferred_date)}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0 mt-0.5" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
