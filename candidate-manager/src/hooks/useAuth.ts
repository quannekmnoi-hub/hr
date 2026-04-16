import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); return false }
    return true
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    setError(null)
    const { error: err } = await supabase.auth.signUp({ email, password })
    if (err) { setError(err.message); return false }
    return true
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return { user, loading, error, login, register, logout, setError }
}
