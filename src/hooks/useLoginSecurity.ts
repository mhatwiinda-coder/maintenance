/**
 * Client-side login attempt limiting.
 * Locks out the user for LOCKOUT_DURATION after MAX_ATTEMPTS failures.
 * State is stored in localStorage so it persists across page refreshes.
 */

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes
const STORAGE_KEY = 'mainza_login_security'

interface SecurityData {
  count: number
  lockedUntil: number
}

function getData(): SecurityData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { count: 0, lockedUntil: 0 }
    return JSON.parse(raw)
  } catch {
    return { count: 0, lockedUntil: 0 }
  }
}

function saveData(data: SecurityData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function useLoginSecurity() {

  function isLockedOut(): { locked: boolean; remainingMs: number } {
    const data = getData()
    const remaining = data.lockedUntil - Date.now()
    if (remaining > 0) return { locked: true, remainingMs: remaining }
    return { locked: false, remainingMs: 0 }
  }

  function recordFailure(): { attemptsLeft: number; locked: boolean } {
    const data = getData()
    const count = data.count + 1
    const lockedUntil = count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_DURATION : data.lockedUntil
    saveData({ count, lockedUntil })
    return {
      attemptsLeft: Math.max(0, MAX_ATTEMPTS - count),
      locked: count >= MAX_ATTEMPTS,
    }
  }

  function recordSuccess() {
    localStorage.removeItem(STORAGE_KEY)
  }

  function formatRemaining(ms: number): string {
    const mins = Math.ceil(ms / 60000)
    return `${mins} minute${mins !== 1 ? 's' : ''}`
  }

  return { isLockedOut, recordFailure, recordSuccess, formatRemaining, MAX_ATTEMPTS }
}
