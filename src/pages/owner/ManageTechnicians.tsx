import { useEffect, useState } from 'react'
import { Loader2, Phone, Plus, Eye, EyeOff, Wrench } from 'lucide-react'
import { sendWelcomeEmail } from '@/lib/email'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { Profile } from '@/lib/database.types'

const schema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

interface TechWithCount extends Profile { active_jobs: number; completed_jobs: number }

export default function ManageTechnicians() {
  const [technicians, setTechnicians] = useState<TechWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

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

  async function onSubmit(data: FormData) {
    setSaving(true)
    setServerError(null)
    setSuccess(null)

    try {
      // Use temp client — owner session stays intact
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL as string,
        import.meta.env.VITE_SUPABASE_ANON_KEY as string
      )

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.full_name, role: 'technician' },
        },
      })

      if (authError) { setServerError(authError.message); setSaving(false); return }

      if (authData.user) {
        await supabase.from('profiles').update({
          phone: data.phone || null,
        }).eq('id', authData.user.id)
      }

      // Send welcome email with credentials
      await sendWelcomeEmail({
        to_email: data.email,
        to_name: data.full_name,
        role: 'Technician',
        login_email: data.email,
        temp_password: data.password,
      })

      setSuccess(`✅ Technician account created!\nLogin: ${data.email}\nPassword: ${data.password}`)
      reset()
      fetchData()
    } catch {
      setServerError('Failed to create account. Please try again.')
    }
    setSaving(false)
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) { reset(); setServerError(null); setSuccess(null) }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Technicians</h1>
          <p className="text-muted-foreground text-sm mt-1">{technicians.length} registered technician{technicians.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Onboard Technician
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : technicians.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <Wrench className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No technicians yet</p>
            <p className="text-sm mt-1">Onboard your first field technician</p>
            <Button className="mt-4 gap-2" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Onboard Technician
            </Button>
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
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{t.full_name}</p>
                      <Badge variant="success" className="text-xs mt-0.5">Technician</Badge>
                    </div>
                  </div>
                  {t.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-3">
                      <Phone className="h-3 w-3" />{t.phone}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className={`rounded-lg p-2.5 ${t.active_jobs > 0 ? 'bg-blue-50' : 'bg-muted/50'}`}>
                      <p className={`text-lg font-bold ${t.active_jobs > 0 ? 'text-blue-800' : 'text-foreground'}`}>{t.active_jobs}</p>
                      <p className={`text-xs ${t.active_jobs > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>Active</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2.5">
                      <p className="text-lg font-bold text-green-800">{t.completed_jobs}</p>
                      <p className="text-xs text-green-600">Done</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Onboard Technician Dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Onboard New Technician</DialogTitle>
            <DialogDescription>Create a login account for the technician. Share credentials with them directly.</DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 whitespace-pre-line font-medium">{success}</div>
              <p className="text-xs text-muted-foreground">Share these credentials securely with the technician.</p>
              <DialogFooter>
                <Button onClick={() => { setSuccess(null); reset() }}>Add Another</Button>
                <Button variant="outline" onClick={() => handleOpenChange(false)}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input placeholder="Technician full name" {...register('full_name')} />
                {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Email Address *</Label>
                <Input type="email" placeholder="tech@mainza.com" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input placeholder="+260 97 000 0000" {...register('phone')} />
              </div>
              <div className="space-y-1.5">
                <Label>Temporary Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Set a login password"
                    {...register('password')}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              {serverError && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{serverError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
