import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, CheckCircle, XCircle, User, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { formatDate, formatDateTime, formatDuration } from '@/lib/utils'
import type { WorkOrder, WorkOrderStatusHistory, TimeLog, Profile } from '@/lib/database.types'

export default function OwnerWorkOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [wo, setWo] = useState<WorkOrder | null>(null)
  const [history, setHistory] = useState<WorkOrderStatusHistory[]>([])
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
  const [technicians, setTechnicians] = useState<Profile[]>([])
  const [selectedTech, setSelectedTech] = useState<string>('')
  const [ownerNotes, setOwnerNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (id) fetchAll(id) }, [id])

  async function fetchAll(woId: string) {
    setLoading(true)
    const [{ data: woData }, { data: histData }, { data: tlData }, { data: techData }] = await Promise.all([
      supabase.from('work_orders').select('*, client:profiles!client_id(full_name, phone), technician:profiles!technician_id(full_name)').eq('id', woId).single(),
      supabase.from('work_order_status_history').select('*').eq('work_order_id', woId).order('created_at', { ascending: false }),
      supabase.from('time_logs').select('*').eq('work_order_id', woId).order('start_time', { ascending: true }),
      supabase.from('profiles').select('id, full_name, phone').eq('role', 'technician'),
    ])
    if (woData) { setWo(woData as WorkOrder); setOwnerNotes(woData.owner_notes ?? '') }
    if (histData) setHistory(histData as WorkOrderStatusHistory[])
    if (tlData) setTimeLogs(tlData as TimeLog[])
    if (techData) setTechnicians(techData as Profile[])
    setLoading(false)
  }

  async function changeStatus(newStatus: WorkOrder['status'], techId?: string) {
    if (!wo || !profile) return
    setSaving(true)

    const updates: Partial<WorkOrder> = {
      status: newStatus,
      owner_notes: ownerNotes || null,
    }
    if (newStatus === 'accepted') updates.accepted_at = new Date().toISOString()
    if (newStatus === 'assigned' && techId) {
      updates.technician_id = techId
      updates.assigned_at = new Date().toISOString()
    }
    if (newStatus === 'cancelled') updates.owner_notes = ownerNotes || null

    const { error } = await supabase.from('work_orders').update(updates).eq('id', wo.id)
    if (!error) {
      await supabase.from('work_order_status_history').insert({
        work_order_id: wo.id,
        old_status: wo.status,
        new_status: newStatus,
        changed_by: profile.id,
        note: ownerNotes || null,
      })
      fetchAll(wo.id)
    }
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!wo) return <div className="p-6 text-muted-foreground">Work order not found.</div>

  const totalMins = timeLogs.reduce((acc, tl) => acc + (tl.duration_mins ?? 0), 0)

  return (
    <div className="p-6 max-w-3xl space-y-5">
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

      {/* Details */}
      <Card>
        <CardContent className="p-5 grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted-foreground text-xs mb-0.5">Client</p><p className="font-medium flex items-center gap-1"><User className="h-3 w-3" />{(wo.client as { full_name?: string })?.full_name ?? '—'}</p></div>
          <div><p className="text-muted-foreground text-xs mb-0.5">Preferred Date</p><p className="font-medium">{formatDate(wo.preferred_date)}</p></div>
          <div><p className="text-muted-foreground text-xs mb-0.5">Booked</p><p className="font-medium">{formatDateTime(wo.created_at)}</p></div>
          <div><p className="text-muted-foreground text-xs mb-0.5">Technician</p><p className="font-medium">{(wo.technician as { full_name?: string })?.full_name ?? '—'}</p></div>
          {timeLogs.length > 0 && (
            <div className="col-span-2">
              <p className="text-muted-foreground text-xs mb-0.5">Total Time Logged</p>
              <p className="font-medium flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(totalMins)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Owner Actions */}
      {(wo.status === 'pending' || wo.status === 'accepted') && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Actions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                placeholder="Add notes for the client or technician..."
                value={ownerNotes}
                onChange={e => setOwnerNotes(e.target.value)}
              />
            </div>

            {wo.status === 'pending' && (
              <div className="flex gap-3">
                <Button onClick={() => changeStatus('accepted')} disabled={saving} className="gap-2">
                  <CheckCircle className="h-4 w-4" /> Accept Work Order
                </Button>
                <Button variant="destructive" onClick={() => changeStatus('cancelled')} disabled={saving} className="gap-2">
                  <XCircle className="h-4 w-4" /> Decline
                </Button>
              </div>
            )}

            {wo.status === 'accepted' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Assign Technician</Label>
                  <Select value={selectedTech} onValueChange={setSelectedTech}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a technician..." />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => changeStatus('assigned', selectedTech)} disabled={!selectedTech || saving} className="gap-2">
                  <User className="h-4 w-4" /> Assign &amp; Notify Technician
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Time Logs */}
      {timeLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Time Logs</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {timeLogs.map(tl => (
                <div key={tl.id} className="px-5 py-3 text-sm flex items-center gap-4">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">Started: {formatDateTime(tl.start_time)}</p>
                    <p className="text-muted-foreground text-xs">
                      {tl.end_time ? `Ended: ${formatDateTime(tl.end_time)} · Duration: ${formatDuration(tl.duration_mins)}` : 'In progress...'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status History */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Status History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">No history yet</p>
          ) : (
            <div className="divide-y">
              {history.map(h => (
                <div key={h.id} className="px-5 py-3 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    {h.old_status && <><StatusBadge status={h.old_status} /><span className="text-muted-foreground">→</span></>}
                    <StatusBadge status={h.new_status} />
                    <span className="text-xs text-muted-foreground ml-auto">{formatDateTime(h.created_at)}</span>
                  </div>
                  {h.note && <p className="text-muted-foreground mt-1 text-xs">{h.note}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
