import { useEffect, useRef, useCallback } from 'react'

const IDLE_EVENTS = [
  'mousedown', 'mousemove', 'keydown',
  'scroll', 'touchstart', 'click', 'wheel',
]

/**
 * Auto-logout after a period of inactivity.
 * @param timeoutMs  Inactivity threshold in milliseconds (default 15 min)
 * @param onTimeout  Called when the user has been idle too long
 */
export function useIdleTimeout(
  onTimeout: () => void,
  timeoutMs = 15 * 60 * 1000 // 15 minutes
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onTimeoutRef.current()
    }, timeoutMs)
  }, [timeoutMs])

  useEffect(() => {
    resetTimer()
    IDLE_EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))

    // Also reset when the tab becomes visible again
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') resetTimer()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      IDLE_EVENTS.forEach(e => window.removeEventListener(e, resetTimer))
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [resetTimer])
}
