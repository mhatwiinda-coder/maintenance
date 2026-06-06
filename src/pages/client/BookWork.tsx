import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, Loader2, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PriorityLevel } from '@/lib/database.types'

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(120),
  description: z.string().min(10, 'Please describe the issue in more detail').max(2000),
  priority: z.enum(['low', 'medium', 'high', 'urgent'] as const),
  preferred_date: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function BookWork() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [priority, setPriority] = useState<PriorityLevel>('medium')

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium' },
  })

  async function onSubmit(data: FormData) {
    if (!profile?.id) return
    setServerError(null)

    const { error } = await supabase.from('work_orders').insert({
      title: data.title,
      description: data.description,
      priority: data.priority,
      preferred_date: data.preferred_date || null,
      client_id: profile.id,
      company_id: profile.company_id,
      status: 'pending',
    })

    if (error) { setServerError(error.message); return }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Request Submitted!</h2>
          <p className="text-muted-foreground text-sm mb-6">Your maintenance request has been sent to the owner. You'll be notified once it's reviewed.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setSubmitted(false)}>Book Another</Button>
            <Button onClick={() => navigate('/client')}>Back to Dashboard</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Book Maintenance Work</h1>
        <p className="text-muted-foreground text-sm mt-1">Describe the issue and we'll get back to you soon</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Job Details</CardTitle>
          <CardDescription>Be as specific as possible — it helps us assign the right technician</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">Job Title *</Label>
              <Input id="title" placeholder="e.g. Pump motor failure at Section A" {...register('title')} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" rows={5} placeholder="Describe the problem in detail. Include location, what happened, any error codes, safety concerns..." {...register('description')} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority *</Label>
                <Select value={priority} onValueChange={v => { const p = v as PriorityLevel; setPriority(p); setValue('priority', p) }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Low — Not urgent</SelectItem>
                    <SelectItem value="medium">🔵 Medium — Within days</SelectItem>
                    <SelectItem value="high">🟡 High — Within 24 hours</SelectItem>
                    <SelectItem value="urgent">🔴 Urgent — Immediate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="preferred_date">Preferred Date</Label>
                <Input id="preferred_date" type="date" {...register('preferred_date')} min={new Date().toISOString().split('T')[0]} />
              </div>
            </div>

            {serverError && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</> : 'Submit Request'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
