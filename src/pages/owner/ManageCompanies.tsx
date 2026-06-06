import { useEffect, useState } from 'react'
import { Building2, Plus, Phone, Mail, MapPin, Loader2, Trash2, ClipboardList } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import type { Company } from '@/lib/database.types'

const schema = z.object({
  name: z.string().min(2, 'Company name is required'),
  email: z.string().email('Invalid email').or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface CompanyWithCount extends Company { work_order_count: number; client_count: number }

export default function ManageCompanies() {
  const [companies, setCompanies] = useState<CompanyWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => { fetchCompanies() }, [])

  async function fetchCompanies() {
    setLoading(true)
    const { data } = await supabase.from('companies').select('*').order('name')
    if (data) {
      const enriched = await Promise.all((data as Company[]).map(async (c) => {
        const [{ count: woCount }, { count: clientCount }] = await Promise.all([
          supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('company_id', c.id),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('company_id', c.id).eq('role', 'client'),
        ])
        return { ...c, work_order_count: woCount ?? 0, client_count: clientCount ?? 0 }
      }))
      setCompanies(enriched)
    }
    setLoading(false)
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    setServerError(null)
    const { error } = await supabase.from('companies').insert({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
    })
    if (error) { setServerError(error.message); setSaving(false); return }
    reset()
    setOpen(false)
    setSaving(false)
    fetchCompanies()
  }

  async function deleteCompany(id: string) {
    await supabase.from('companies').delete().eq('id', id)
    fetchCompanies()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Companies</h1>
          <p className="text-muted-foreground text-sm mt-1">{companies.length} registered companies</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No companies yet</p>
            <p className="text-sm mt-1">Add your first client company to get started</p>
            <Button className="mt-4 gap-2" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Add Company
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map(c => (
            <Card key={c.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{c.name}</CardTitle>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                        <AlertDialogDescription>This will remove the company record. Existing work orders and users will not be deleted.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteCompany(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {c.email && <p className="text-muted-foreground flex items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0" />{c.email}</p>}
                {c.phone && <p className="text-muted-foreground flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0" />{c.phone}</p>}
                {c.address && <p className="text-muted-foreground flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" />{c.address}</p>}
                <div className="flex gap-3 pt-2 border-t mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ClipboardList className="h-3.5 w-3.5" />
                    <span>{c.work_order_count} job{c.work_order_count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{c.client_count} client{c.client_count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Company Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Company</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input placeholder="e.g. Kansanshi Mining PLC" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="info@company.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="+260 97 000 0000" {...register('phone')} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input placeholder="Mine site / physical address" {...register('address')} />
            </div>
            {serverError && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Register Company
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
