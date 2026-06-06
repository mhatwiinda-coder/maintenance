import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { HardHat, Loader2, ShieldAlert, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLoginSecurity } from '@/hooks/useLoginSecurity'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { signIn, role } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const security = useLoginSecurity()

  const timedOut = (location.state as { reason?: string })?.reason === 'timeout'

  const [serverError, setServerError] = useState<string | null>(null)
  const [lockoutMsg, setLockoutMsg] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Check lockout on mount + tick countdown
  useEffect(() => {
    const { locked, remainingMs } = security.isLockedOut()
    if (locked) {
      setCountdown(remainingMs)
      setLockoutMsg(security.formatRemaining(remainingMs))
    }
  }, [])

  useEffect(() => {
    if (countdown <= 0) { setLockoutMsg(null); return }
    const interval = setInterval(() => {
      setCountdown(prev => {
        const next = prev - 1000
        if (next <= 0) { setLockoutMsg(null); clearInterval(interval); return 0 }
        setLockoutMsg(security.formatRemaining(next))
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [countdown])

  async function onSubmit(data: FormData) {
    // Check lockout before attempting
    const { locked, remainingMs } = security.isLockedOut()
    if (locked) {
      setLockoutMsg(security.formatRemaining(remainingMs))
      setCountdown(remainingMs)
      return
    }

    setServerError(null)
    const { error } = await signIn(data.email, data.password)

    if (error) {
      const { attemptsLeft, locked: nowLocked } = security.recordFailure()
      if (nowLocked) {
        setLockoutMsg('15 minutes')
        setCountdown(15 * 60 * 1000)
        setServerError(null)
      } else {
        setServerError(
          attemptsLeft > 0
            ? `${error}. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining before lockout.`
            : error
        )
      }
      return
    }

    security.recordSuccess()
    setTimeout(() => {
      if (role === 'owner') navigate('/owner')
      else if (role === 'technician') navigate('/technician')
      else navigate('/client')
    }, 300)
  }

  const isLocked = !!lockoutMsg

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary shadow-lg mb-4">
            <HardHat className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">ZAI Maintenance</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Session timeout banner */}
        {timedOut && !isLocked && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Session expired</p>
              <p className="text-xs text-amber-700 mt-0.5">You were logged out after 15 minutes of inactivity.</p>
            </div>
          </div>
        )}

        {/* Lockout banner */}
        {isLocked && (
          <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-4 flex items-start gap-3">
            <Lock className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">Account temporarily locked</p>
              <p className="text-xs text-destructive/80 mt-1">
                Too many failed attempts. Try again in <strong>{lockoutMsg}</strong>.
              </p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              {isLocked ? <ShieldAlert className="h-5 w-5 text-destructive" /> : null}
              Welcome back
            </CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  disabled={isLocked}
                  {...register('email')}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLocked}
                  {...register('password')}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              {serverError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  {serverError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || isLocked}
              >
                {isSubmitting
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Signing in...</>
                  : isLocked
                  ? <><Lock className="h-4 w-4 mr-2" />Locked</>
                  : 'Sign In'
                }
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Contact your administrator to get access.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          🔒 Secured · Auto-logout after 15 min inactivity
        </p>
      </div>
    </div>
  )
}
