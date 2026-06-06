import { useEffect, useState } from 'react'
import { Loader2, User, Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Profile } from '@/lib/database.types'

interface TechWithCount extends Profile {
  active_jobs: number
  completed_jobs: number
}

export default function ManageTechnicians() {
  const [technicians, setTechnicians] = useState<TechWithCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data: techs } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'technician')
      .order('full_name')

    if (techs) {
      const enriched = await Promise.all(
        (techs as Profile[]).map(async (t) => {
          const [{ count: active }, { count: done }] = await Promise.all([
            supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('technician_id', t.id).in('status', ['assigned', 'in_progress']),
            supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('technician_id', t.id).eq('status', 'completed'),
          ])
          return { ...t, active_jobs: active ?? 0, completed_jobs: done ?? 0 }
        })
      )
      setTechnicians(enriched)
    }
    setLoading(false)
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Technicians</h1>
        <p className="text-muted-foreground text-sm mt-1">{technicians.length} registered technician{technicians.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : technicians.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No technicians registered yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {technicians.map(t => {
            const initials = t.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            return (
              <Card key={t.id}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-green-100 text-green-800 font-semibold text-sm">{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{t.full_name}</p>
                      <p className="text-xs text-muted-foreground">Technician</p>
                    </div>
                  </div>

                  {t.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-3">
                      <Phone className="h-3 w-3" />{t.phone}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-blue-50 rounded-lg p-2.5">
                      <p className="text-lg font-bold text-blue-800">{t.active_jobs}</p>
                      <p className="text-xs text-blue-600">Active</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2.5">
                      <p className="text-lg font-bold text-green-800">{t.completed_jobs}</p>
                      <p className="text-xs text-green-600">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
