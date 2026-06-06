import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ArrowRight, PlayCircle, CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { formatDate, timeAgo } from '@/lib/utils'
import type { WorkOrder } from '@/lib/database.types'

export default function TechnicianDashboard() {
  const { profile } = useAuth()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) {
      fetchData()
      const channel = supabase
        .channel('tech-work-orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders', filter: `technician_id=eq.${profile.id}` }, fetchData)
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [profile?.id])

  async function fetchData() {
    if (!profile?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('work_orders')
      .select('*, client:profiles!client_id(full_name, phone)')
      .eq('technician_id', profile.id)
      .in('status', ['assigned', 'in_progress'])
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setWorkOrders(data as WorkOrder[])
    setLoading(false)
  }

  const inProgress = workOrders.filter(w => w.status === 'in_progress')
  const assigned = workOrders.filter(w => w.status === 'assigned')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Jobs</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome, {profile?.full_name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className={inProgress.length > 0 ? 'border-blue-200 bg-blue-50/50' : ''}>
          <CardContent className="p-5">
            <p className={`text-sm ${inProgress.length > 0 ? 'text-blue-700' : 'text-muted-foreground'}`}>In Progress</p>
            <p className={`text-3xl font-bold mt-1 ${inProgress.length > 0 ? 'text-blue-800' : ''}`}>{inProgress.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Assigned</p>
            <p className="text-3xl font-bold mt-1">{assigned.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Active</p>
            <p className="text-3xl font-bold mt-1">{workOrders.length}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : workOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm">No active jobs assigned to you right now.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* In Progress first */}
          {inProgress.length > 0 && (
            <Card className="border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                  <PlayCircle className="h-4 w-4 text-blue-500" /> Currently In Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {inProgress.map(wo => <JobRow key={wo.id} wo={wo} />)}
              </CardContent>
            </Card>
          )}

          {/* Assigned */}
          {assigned.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" /> Assigned — Not Yet Started
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {assigned.map(wo => <JobRow key={wo.id} wo={wo} />)}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function JobRow({ wo }: { wo: WorkOrder }) {
  return (
    <Link to={`/technician/jobs/${wo.id}`}
      className="flex items-start gap-4 px-6 py-4 hover:bg-muted/40 transition-colors group border-b last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{wo.title}</p>
          <StatusBadge status={wo.status} />
          <PriorityBadge priority={wo.priority} />
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-muted-foreground">
            Client: {(wo.client as { full_name?: string })?.full_name ?? '—'}
          </span>
          <span className="text-xs text-muted-foreground">{timeAgo(wo.created_at)}</span>
        </div>
        {wo.preferred_date && (
          <p className="text-xs text-muted-foreground mt-0.5">Preferred: {formatDate(wo.preferred_date)}</p>
        )}
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0 mt-0.5" />
    </Link>
  )
}
