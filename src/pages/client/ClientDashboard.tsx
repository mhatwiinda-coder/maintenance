import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Clock, PlusCircle, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { timeAgo } from '@/lib/utils'
import type { WorkOrder } from '@/lib/database.types'

export default function ClientDashboard() {
  const { profile } = useAuth()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) {
      fetchData()
      const channel = supabase
        .channel('client-work-orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders', filter: `client_id=eq.${profile.id}` }, fetchData)
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [profile?.id])

  async function fetchData() {
    if (!profile?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('work_orders')
      .select('*, technician:profiles!technician_id(full_name)')
      .eq('client_id', profile.id)
      .order('created_at', { ascending: false })
    if (data) setWorkOrders(data as WorkOrder[])
    setLoading(false)
  }

  const wip = workOrders.filter(w => !['completed', 'cancelled'].includes(w.status))
  const completed = workOrders.filter(w => w.status === 'completed')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {profile?.full_name?.split(' ')[0]}</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your maintenance requests</p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/client/book"><PlusCircle className="h-4 w-4" /> Book New Work</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Requests</p>
            <p className="text-3xl font-bold mt-1">{workOrders.length}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-5">
            <p className="text-sm text-blue-700">Work in Progress</p>
            <p className="text-3xl font-bold mt-1 text-blue-800">{wip.length}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-5">
            <p className="text-sm text-green-700">Completed</p>
            <p className="text-3xl font-bold mt-1 text-green-800">{completed.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* WIP */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" /> Work in Progress ({wip.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : wip.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <p>No active requests.</p>
              <Button variant="link" asChild className="mt-1"><Link to="/client/book">Book your first job →</Link></Button>
            </div>
          ) : (
            <div className="divide-y">
              {wip.map(wo => (
                <Link key={wo.id} to={`/client/work-orders/${wo.id}`}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-muted/40 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{wo.title}</p>
                      <StatusBadge status={wo.status} />
                      <PriorityBadge priority={wo.priority} />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {wo.technician_id && <span className="text-xs text-muted-foreground">Tech: {(wo.technician as { full_name?: string })?.full_name}</span>}
                      <span className="text-xs text-muted-foreground">{timeAgo(wo.created_at)}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0 mt-0.5" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed */}
      {completed.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Completed Jobs ({completed.length})
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/client/work-orders">View all <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {completed.slice(0, 5).map(wo => (
                <Link key={wo.id} to={`/client/work-orders/${wo.id}`}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-muted/40 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{wo.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Completed {timeAgo(wo.completed_at)}</p>
                  </div>
                  <StatusBadge status={wo.status} />
                  <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0 mt-0.5" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
