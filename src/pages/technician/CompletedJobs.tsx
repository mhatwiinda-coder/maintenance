import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ArrowRight, CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { formatDate, formatDuration, timeAgo } from '@/lib/utils'
import type { WorkOrder } from '@/lib/database.types'

interface WorkOrderWithDuration extends WorkOrder { total_mins?: number }

export default function CompletedJobs() {
  const { profile } = useAuth()
  const [jobs, setJobs] = useState<WorkOrderWithDuration[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile?.id) fetchData() }, [profile?.id])

  async function fetchData() {
    if (!profile?.id) return
    setLoading(true)
    const { data: wos } = await supabase
      .from('work_orders')
      .select('*, client:profiles!client_id(full_name)')
      .eq('technician_id', profile.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })

    if (wos) {
      const enriched = await Promise.all((wos as WorkOrder[]).map(async (wo) => {
        const { data: logs } = await supabase.from('time_logs').select('duration_mins').eq('work_order_id', wo.id)
        const total_mins = logs?.reduce((acc, l) => acc + (l.duration_mins ?? 0), 0) ?? 0
        return { ...wo, total_mins }
      }))
      setJobs(enriched)
    }
    setLoading(false)
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Completed Jobs</h1>
        <p className="text-muted-foreground text-sm mt-1">{jobs.length} job{jobs.length !== 1 ? 's' : ''} completed</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> Your Work History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-sm">No completed jobs yet</p>
          ) : (
            <div className="divide-y">
              {jobs.map(wo => (
                <Link key={wo.id} to={`/technician/jobs/${wo.id}`}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-muted/40 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{wo.title}</p>
                      <PriorityBadge priority={wo.priority} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        Client: {(wo.client as { full_name?: string })?.full_name ?? '—'}
                      </span>
                      {wo.total_mins ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />{formatDuration(wo.total_mins)}
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        Completed {timeAgo(wo.completed_at)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(wo.completed_at)}</span>
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
