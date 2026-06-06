import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, PlayCircle, StopCircle, CheckCircle, Clock, User, Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { formatDate, formatDateTime, formatDuration } from '@/lib/utils'
import type { WorkOrder, TimeLog } from '@/lib/database.types'

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [wo, setWo] = useState<WorkOrder | null>(null)
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
  const [activeLog, setActiveLog] = useState<TimeLog | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (id) fetchAll(id) }, [id])

  async function fetchAll(woId: string) {
    setLoading(true)
    const [{ data: woData }, { data: tlData }] = await Promise.all([
      supabase.from('work_orders').select('*, client:profiles!client_id(full_name, phone)').eq('id', woId).single(),
      supabase.from('time_logs').select('*').eq('work_order_id', woId).eq('technician_id', profile?.id ?? '').order('start_time', { ascending: false }),
    ])
    if (woData) setWo(woData as WorkOrder)
    if (tlData) {
      setTimeLogs(tlData as TimeLog[])
      const open = (tlData as TimeLog[]).find(tl => !tl.end_time)
      setActiveLog(open ?? null)
    }
    setLoading(false)
  }

  async function startWork() {
    if (!wo || !profile) return
    setSaving(true)

    // Log start time + update work order status
    const { data: tl } = await supabase.from('time_logs').insert({
      work_order_id: wo.id,
      technician_id: profile.id,
      start_time: new Date().toISOString(),
    }).select().single()

    await supabase.from('work_orders').update({ status: 'in_progress' }).eq('id', wo.id)
    await supabase.from('work_order_status_history').insert({
      work_order_id: wo.id, old_status: wo.status, new_status: 'in_progress', changed_by: profile.id,
    })

    setSaving(false)
    if (tl) setActiveLog(tl as TimeLog)
    fetchAll(wo.id)
  }

  async function endWork() {
    if (!wo || !profile || !activeLog) return
    setSaving(true)

    await supabase.from('time_logs').update({
      end_time: new Date().toISOString(),
      notes: notes || null,
    }).eq('id', activeLog.id)

    await supabase.from('work_orders').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', wo.id)
    await supabase.from('work_order_status_history').insert({
      work_order_id: wo.id, old_status: 'in_progress', new_status: 'completed', changed_by: profile.id, note: notes || null,
    })

    setSaving(false)
    setActiveLog(null)
    fetchAll(wo.id)
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!wo) return <div className="p-6 text-muted-foreground">Job not found.</div>

  const totalMins = timeLogs.reduce((acc, tl) => acc + (tl.duration_mins ?? 0), 0)
  const client = wo.client as { full_name?: string; phone?: string } | null

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

      {/* Client Info */}
      <Card>
        <CardContent className="p-5 space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{client?.full_name ?? '—'}</span>
          </div>
          {client?.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${client.phone}`} className="text-primary hover:underline">{client.phone}</a>
            </div>
          )}
          {wo.preferred_date && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Preferred date: {formatDate(wo.preferred_date)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Logging Actions */}
      {wo.status !== 'completed' && wo.status !== 'cancelled' && (
        <Card className={activeLog ? 'border-blue-300 bg-blue-50/30' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className={`h-4 w-4 ${activeLog ? 'text-blue-500' : 'text-muted-foreground'}`} />
              {activeLog ? 'Work in Progress' : 'Start Working'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeLog ? (
              <>
                <div className="bg-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
                  <p className="font-medium">Started at {formatDateTime(activeLog.start_time)}</p>
                  <p className="text-xs mt-0.5 text-blue-600">Timer is running...</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Completion Notes</Label>
                  <Textarea placeholder="Describe what was done, any parts used, issues encountered..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
                </div>
                <Button onClick={endWork} disabled={saving} className="w-full gap-2 bg-green-600 hover:bg-green-700" size="lg">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-5 w-5" />}
                  End Work &amp; Mark Complete
                </Button>
              </>
            ) : (
              <Button onClick={startWork} disabled={saving} className="w-full gap-2" size="lg">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-5 w-5" />}
                Start Work — Log Time
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {wo.status === 'completed' && (
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="p-5 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
            <div>
              <p className="font-medium text-green-800">Job Completed</p>
              <p className="text-xs text-green-600">Total time: {formatDuration(totalMins)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Log History */}
      {timeLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Time Log</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {timeLogs.map(tl => (
                <div key={tl.id} className="px-5 py-3 text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-medium">Started: {formatDateTime(tl.start_time)}</p>
                      {tl.end_time ? (
                        <p className="text-muted-foreground text-xs">Ended: {formatDateTime(tl.end_time)} · {formatDuration(tl.duration_mins)}</p>
                      ) : (
                        <p className="text-blue-600 text-xs font-medium">⏱ Running...</p>
                      )}
                      {tl.notes && <p className="text-muted-foreground text-xs mt-1 italic">"{tl.notes}"</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalMins > 0 && (
              <div className="px-5 py-3 border-t bg-muted/30 text-sm font-semibold flex justify-between">
                <span>Total Duration</span>
                <span>{formatDuration(totalMins)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
