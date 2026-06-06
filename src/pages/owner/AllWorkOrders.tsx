import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ArrowRight, Search, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { formatDate, timeAgo } from '@/lib/utils'
import type { WorkOrder, WorkOrderStatus } from '@/lib/database.types'

export default function AllWorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [filtered, setFiltered] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'all'>('all')

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    let list = workOrders
    if (statusFilter !== 'all') list = list.filter(w => w.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(w =>
        w.title.toLowerCase().includes(q) ||
        (w.description ?? '').toLowerCase().includes(q) ||
        ((w.client as { full_name?: string })?.full_name ?? '').toLowerCase().includes(q)
      )
    }
    setFiltered(list)
  }, [workOrders, search, statusFilter])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('work_orders')
      .select('*, client:profiles!client_id(full_name), technician:profiles!technician_id(full_name)')
      .order('created_at', { ascending: false })
    if (data) setWorkOrders(data as WorkOrder[])
    setLoading(false)
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">All Work Orders</h1>
        <p className="text-muted-foreground text-sm mt-1">{workOrders.length} total jobs</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search jobs, clients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as WorkOrderStatus | 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{filtered.length} work order{filtered.length !== 1 ? 's' : ''}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-sm">No work orders found</p>
          ) : (
            <div className="divide-y">
              {filtered.map(wo => (
                <Link key={wo.id} to={`/owner/work-orders/${wo.id}`}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-muted/40 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{wo.title}</p>
                      <StatusBadge status={wo.status} />
                      <PriorityBadge priority={wo.priority} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {(wo.client as { full_name?: string })?.full_name ?? '—'}
                      </span>
                      {wo.technician_id && (
                        <span className="text-xs text-muted-foreground">
                          Tech: {(wo.technician as { full_name?: string })?.full_name ?? '—'}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{timeAgo(wo.created_at)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">{formatDate(wo.preferred_date)}</div>
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
