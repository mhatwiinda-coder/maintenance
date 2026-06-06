import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { formatDate, timeAgo } from '@/lib/utils'
import type { WorkOrder } from '@/lib/database.types'

export default function ClientWorkOrders() {
  const { profile } = useAuth()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) fetchData()
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

  const active = workOrders.filter(w => !['completed', 'cancelled'].includes(w.status))
  const done = workOrders.filter(w => w.status === 'completed')
  const cancelled = workOrders.filter(w => w.status === 'cancelled')

  function WorkOrderRow({ wo }: { wo: WorkOrder }) {
    return (
      <Link to={`/client/work-orders/${wo.id}`}
        className="flex items-start gap-4 px-6 py-4 hover:bg-muted/40 transition-colors group">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{wo.title}</p>
            <StatusBadge status={wo.status} />
            <PriorityBadge priority={wo.priority} />
          </div>
          <div className="flex gap-3 mt-1">
            {wo.technician_id && <span className="text-xs text-muted-foreground">Tech: {(wo.technician as { full_name?: string })?.full_name}</span>}
            <span className="text-xs text-muted-foreground">{timeAgo(wo.created_at)}</span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{formatDate(wo.preferred_date)}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0 mt-0.5" />
      </Link>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-bold">My Work Orders</h1>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({done.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <TabsContent value="active">
              <Card className="mt-3"><CardContent className="p-0">
                {active.length === 0 ? <p className="text-center py-8 text-sm text-muted-foreground">No active requests</p>
                  : <div className="divide-y">{active.map(wo => <WorkOrderRow key={wo.id} wo={wo} />)}</div>}
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="completed">
              <Card className="mt-3"><CardContent className="p-0">
                {done.length === 0 ? <p className="text-center py-8 text-sm text-muted-foreground">No completed jobs yet</p>
                  : <div className="divide-y">{done.map(wo => <WorkOrderRow key={wo.id} wo={wo} />)}</div>}
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="cancelled">
              <Card className="mt-3"><CardContent className="p-0">
                {cancelled.length === 0 ? <p className="text-center py-8 text-sm text-muted-foreground">No cancelled requests</p>
                  : <div className="divide-y">{cancelled.map(wo => <WorkOrderRow key={wo.id} wo={wo} />)}</div>}
              </CardContent></Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
