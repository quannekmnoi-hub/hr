import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { AnalyticsData } from '../types'

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Direct query thay vì gọi Edge Function
      const { data: candidates, error } = await supabase
        .from('candidates')
        .select('status, applied_position, created_at')
        .eq('user_id', user.id)

      if (error) throw error

      const total = candidates?.length ?? 0

      // Status ratio
      const statusMap: Record<string, number> = {}
      candidates?.forEach(c => {
        statusMap[c.status] = (statusMap[c.status] ?? 0) + 1
      })
      const statusRatio = Object.entries(statusMap).map(([status, count]) => ({
        status,
        count,
        ratio: total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0,
      }))

      // Top 3 positions
      const posMap: Record<string, number> = {}
      candidates?.forEach(c => {
        const pos = c.applied_position || 'Unknown'
        posMap[pos] = (posMap[pos] ?? 0) + 1
      })
      const topPositions = Object.entries(posMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([position, count]) => ({ position, count }))

      // Recent 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const recentCount = candidates?.filter(
        c => new Date(c.created_at) >= sevenDaysAgo
      ).length ?? 0

      setAnalytics({ total, statusRatio, topPositions, recentCount })
    } catch (err) {
      console.error('Analytics error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  return { analytics, loading, fetchAnalytics }
}
