import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { AnalyticsData, Candidate } from '../types'

function buildAnalyticsFromCandidates(candidates: Candidate[]): AnalyticsData {
  const total = candidates.length

  const statusMap = candidates.reduce<Record<string, number>>((acc, candidate) => {
    acc[candidate.status] = (acc[candidate.status] ?? 0) + 1
    return acc
  }, {})

  const statusRatio = Object.entries(statusMap).map(([status, count]) => ({
    status,
    count,
    ratio: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
  }))

  const positionMap = candidates.reduce<Record<string, number>>((acc, candidate) => {
    const position = candidate.applied_position || 'Unknown'
    acc[position] = (acc[position] ?? 0) + 1
    return acc
  }, {})

  const topPositions = Object.entries(positionMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([position, count]) => ({ position, count }))

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentCandidates = [...candidates]
    .filter((candidate) => new Date(candidate.created_at) >= sevenDaysAgo)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)

  return {
    total,
    statusRatio,
    topPositions,
    recentCandidates,
  }
}

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
      console.warn('Analytics function unavailable, fallback to direct query:', err)
      try {
        const { data: candidates, error } = await supabase
          .from('candidates')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setAnalytics(buildAnalyticsFromCandidates((candidates ?? []) as Candidate[]))
      } catch (fallbackErr) {
        console.error('Analytics fallback error:', fallbackErr)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  return { analytics, loading, fetchAnalytics }
}
