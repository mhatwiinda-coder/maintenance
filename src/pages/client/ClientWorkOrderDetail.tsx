import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Clock, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { formatDate, formatDateTime, formatDuration } from '@/lib/utils'
import type { WorkOrder, WorkOrderStatusHistory, TimeLog } from '@/lib/database.types'

export default function ClientWorkOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [wo, setWo] = useState<WorkOrder | null>(null)
  const [history, setHistory] = useState<WorkOrderStatusHistory[]>([])
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) fetchAll(id) }, [id])

  async function fetchAll(woId: string) {
    setLoading(true)
    const [{ data: woData }, { data: histData }, { data: tlData }] = await Promise.all([
      supabase.from('work_orders').select('*, technician:profiles!technician_id(full_name, phone)').eq('id', woId).single(),
      supabase.from('work_order_status_history').select('*').eq('work_order_id', woId).order('created_at', { ascending: false }),
      supabase.from('time_logs').select('*').eq('work_order_id', woId),
    ])
    if (woData) setWo(woData as WorkOrder)
    if (histData) setHistory(histData as WorkOrderStatusHistory[])
    if (tlData) setTimeLogs(tlData as TimeLog[])
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!wo) return <div className="p-6 text-muted-foreground">Work order not found.</div>

  const totalMins = timeLogs.reduce((acc, tl) => acc + (tl.duration_mins ?? 0), 0)

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1">
          <h1 className="text-xl font-bold">{wo.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{wo.description}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={wo.status} />
          <PriorityBadge priority={wo.priority} />
        </div>
      </div>

      <Card>
        <CardContent className="p-5 grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted-foreground text-xs mb-0.5">Preferred Date</p><p className="font-medium">{formatDate(wo.preferred_date)}</p></div>
          <div><p className="text-muted-foreground text-xs mb-0.5">Booked</p><p className="font-medium">{formatDateTime(wo.created_at)}</p></div>
          {wo.technician_id && (
            <div className="col-span-2">
              <p className="text-muted-foreground text-xs mb-0.5">Assigned Technician</p>
              <p className="font-medium flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {(wo.technician as { full_name?: string; phone?: string })?.full_name ?? '—'}
                {(wo.technician as { full_name?: string; phone?: string })?.phone && (
                  <span className="text-muted-foreground text-xs">· {(wo.technician as { full_name?: string; phone?: string }).phone}</span>
                )}
              </p>
            </div>
          )}
          {wo.owner_notes && (
            <div className="col-span-2">
              <p className="text-muted-foreground text-xs mb-0.5">Owner Notes</p>
              <p className="text-sm bg-muted rounded-md px-3 py-2">{wo.owner_notes}</p>
            </div>
          )}
          {totalMins > 0 && (
            <div className="col-span-2">
              <p className="text-muted-foreground text-xs mb-0.5">Time Logged</p>
              <p className="font-medium flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDuration(totalMins)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Timeline */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Status Timeline</CardTitle></CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">Awaiting review</p>
          ) : (
            <div className="divide-y">
              {history.map(h => (
                <div key={h.id} className="px-5 py-3 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    {h.old_status && <><StatusBadge status={h.old_status} /><span className="text-muted-foreground">→</span></>}
                    <StatusBadge status={h.new_status} />
                    <span className="text-xs text-muted-foreground ml-auto">{formatDateTime(h.created_at)}</span>
                  </div>
                  {h.note && <p className="text-muted-foreground text-xs mt-1">{h.note}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
