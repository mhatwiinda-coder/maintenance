import { useEffect, useState } from 'react'
import { Users, Plus, Phone, Building2, Loader2, Eye, EyeOff } from 'lucide-react'
import { sendWelcomeEmail } from '@/lib/email'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { Profile, Company } from '@/lib/database.types'

const schema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  company_id: z.string().min(1, 'Please select a company'),
})
type FormData = z.infer<typeof schema>

export default function ManageClients() {
  const [clients, setClients] = useState<Profile[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState('')

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: clientData }, { data: companyData }] = await Promise.all([
      supabase.from('profiles').select('*, companies(name)').eq('role', 'client').order('full_name'),
      supabase.from('companies').select('*').order('name'),
    ])
    if (clientData) setClients(clientData as Profile[])
    if (companyData) setCompanies(companyData as Company[])
    setLoading(false)
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    setServerError(null)
    setSuccess(null)

    try {
      // Use a temporary client instance so owner session is NOT affected
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL as string,
        import.meta.env.VITE_SUPABASE_ANON_KEY as string
      )

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            role: 'client',
          },
        },
      })

      if (authError) { setServerError(authError.message); setSaving(false); return }

      // Always explicitly upsert the profile — never rely on trigger alone
      if (authData.user) {
        const { error: upsertErr } = await supabase.from('profiles').upsert({
          id: authData.user.id,
          full_name: data.full_name,
          role: 'client',
          email: data.email,
          phone: data.phone || null,
          company_id: data.company_id,
        }, { onConflict: 'id' })

        // Fallback: retry without email if column not yet added via migration
        if (upsertErr) {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            full_name: data.full_name,
            role: 'client',
            phone: data.phone || null,
            company_id: data.company_id,
          }, { onConflict: 'id' })
        }
      }

      // Send welcome email with credentials
      await sendWelcomeEmail({
        to_email: data.email,
        to_name: data.full_name,
        role: 'Client',
        login_email: data.email,
        temp_password: data.password,
      })

      setSuccess(`✅ Client account created! Login: ${data.email} / Password: ${data.password}`)
      reset()
      setSelectedCompany('')
      fetchData()
    } catch (e) {
      setServerError('Failed to create account. Please try again.')
    }
    setSaving(false)
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) { reset(); setServerError(null); setSuccess(null); setSelectedCompany('') }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Accounts</h1>
          <p className="text-muted-foreground text-sm mt-1">{clients.length} registered client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No clients yet</p>
            <p className="text-sm mt-1">Create client accounts and link them to their companies</p>
            <Button className="mt-4 gap-2" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Add Client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map(c => {
            const initials = c.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            const company = c.companies as { name?: string } | null
            return (
              <Card key={c.id}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-100 text-blue-800 font-semibold text-sm">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{c.full_name}</p>
                      <Badge variant="info" className="text-xs mt-0.5">Client</Badge>
                    </div>
                  </div>
                  {company?.name && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                      <Building2 className="h-3 w-3" />{company.name}
                    </p>
                  )}
                  {c.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />{c.phone}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Client Dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Onboard New Client</DialogTitle>
            <DialogDescription>Create a login account for your client. Share the credentials with them directly.</DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 font-medium">{success}</div>
              <p className="text-xs text-muted-foreground">Make sure to share these credentials with the client securely.</p>
              <DialogFooter>
                <Button onClick={() => { setSuccess(null); reset() }}>Add Another</Button>
                <Button variant="outline" onClick={() => handleOpenChange(false)}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input placeholder="Client contact person name" {...register('full_name')} />
                {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Email Address *</Label>
                <Input type="email" placeholder="client@company.com" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input placeholder="+260 97 000 0000" {...register('phone')} />
              </div>
              <div className="space-y-1.5">
                <Label>Company *</Label>
                <Select value={selectedCompany} onValueChange={v => { setSelectedCompany(v); setValue('company_id', v) }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client company..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.length === 0 ? (
                      <SelectItem value="none" disabled>No companies yet — add one first</SelectItem>
                    ) : (
                      companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
                {errors.company_id && <p className="text-xs text-destructive">{errors.company_id.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Temporary Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Set a password for the client"
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
                  Create Client Account
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
