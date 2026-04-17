import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { AnalyticsData } from '../types'

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke<AnalyticsData>('analytics')
      if (error) throw error
      if (data) setAnalytics(data)
    } catch (err) {
      console.error('Analytics error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  return { analytics, loading, fetchAnalytics }
}
