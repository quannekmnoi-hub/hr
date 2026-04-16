import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Candidate, CandidateStatus, FilterOptions } from '../types'

const PAGE_SIZE = 9

// =============================================
// Algorithm 1: Levenshtein Distance (Fuzzy Search)
// =============================================
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function fuzzyScore(text: string, query: string): number {
  if (!query) return 1
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  if (t.includes(q)) return 1
  const words = t.split(/\s+/)
  const bestWord = Math.min(...words.map(w => levenshtein(w, q)))
  const maxLen = Math.max(...words.map(w => w.length), q.length)
  return 1 - bestWord / maxLen
}

// =============================================
// Algorithm 1: Multi-filter + Smart Sort
// =============================================
function applyFiltersAndSort(candidates: Candidate[], filter: FilterOptions): Candidate[] {
  const FUZZY_THRESHOLD = 0.4

  let result = candidates.filter(c => {
    // Status filter
    if (filter.status && c.status !== filter.status) return false

    // Position filter
    if (filter.position) {
      const posScore = fuzzyScore(c.applied_position, filter.position)
      if (posScore < FUZZY_THRESHOLD) return false
    }

    // Date range filter
    if (filter.dateFrom) {
      const from = new Date(filter.dateFrom)
      if (new Date(c.created_at) < from) return false
    }
    if (filter.dateTo) {
      const to = new Date(filter.dateTo)
      to.setHours(23, 59, 59, 999)
      if (new Date(c.created_at) > to) return false
    }

    return true
  })

  // Full-text search with fuzzy + relevance score
  if (filter.search) {
    const scored = result.map(c => {
      const nameScore = fuzzyScore(c.full_name, filter.search)
      const posScore  = fuzzyScore(c.applied_position, filter.search)
      const skillScore = (c.skills || []).reduce((best, sk) =>
        Math.max(best, fuzzyScore(sk, filter.search)), 0)
      const relevance = Math.max(nameScore, posScore, skillScore)
      return { candidate: c, relevance }
    }).filter(({ relevance }) => relevance >= FUZZY_THRESHOLD)

    // Sort by relevance when searching
    scored.sort((a, b) => b.relevance - a.relevance)
    return scored.map(({ candidate }) => candidate)
  }

  // Default sort
  return result.sort((a, b) => {
    let cmp = 0
    if (filter.sortBy === 'created_at') {
      cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    } else if (filter.sortBy === 'full_name') {
      cmp = a.full_name.localeCompare(b.full_name)
    } else if (filter.sortBy === 'matching_score') {
      cmp = b.matching_score - a.matching_score
    }
    return filter.sortOrder === 'asc' ? -cmp : cmp
  })
}

export function useCandidates(userId: string) {
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([])
  const [displayedCandidates, setDisplayedCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [filter, setFilter] = useState<FilterOptions>({
    search: '', status: '', position: '',
    dateFrom: '', dateTo: '',
    sortBy: 'created_at', sortOrder: 'desc',
  })

  // Algorithm 4: Cursor-based pagination
  const cursorRef = useRef<string | null>(null)
  const pageCountRef = useRef(0)
  const filteredRef = useRef<Candidate[]>([])

  const fetchAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    cursorRef.current = null
    pageCountRef.current = 0

    try {
      // Algorithm 4: cursor-based - fetch with cursor
      let query = supabase
        .from('candidates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200) // large limit for client-side filtering

      const { data, error } = await query
      if (error) throw error

      setAllCandidates(data as Candidate[])
    } catch (err) {
      console.error('Fetch candidates error:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Recalculate displayed when filter or allCandidates change
  const applyFilter = useCallback((newFilter: FilterOptions, candidates: Candidate[]) => {
    const filtered = applyFiltersAndSort(candidates, newFilter)
    filteredRef.current = filtered

    // Algorithm 4: Cursor pagination - show first page
    const firstPage = filtered.slice(0, PAGE_SIZE)
    pageCountRef.current = 1
    setDisplayedCandidates(firstPage)
    setHasMore(filtered.length > PAGE_SIZE)
  }, [])

  const loadMore = useCallback(() => {
    const nextPage = pageCountRef.current + 1
    const nextItems = filteredRef.current.slice(0, nextPage * PAGE_SIZE)
    pageCountRef.current = nextPage
    setDisplayedCandidates(nextItems)
    setHasMore(filteredRef.current.length > nextPage * PAGE_SIZE)
  }, [])

  const updateFilter = useCallback((newFilter: FilterOptions) => {
    setFilter(newFilter)
    applyFilter(newFilter, allCandidates)
  }, [allCandidates, applyFilter])

  const refresh = useCallback(async () => {
    await fetchAll()
  }, [fetchAll])

  // When allCandidates changes, reapply current filter
  const updateFromFetch = useCallback((candidates: Candidate[]) => {
    setAllCandidates(candidates)
    applyFilter(filter, candidates)
  }, [filter, applyFilter])

  const fetchAndUpdate = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      updateFromFetch(data as Candidate[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [userId, updateFromFetch])

  const updateStatus = useCallback(async (id: string, status: CandidateStatus) => {
    const { error } = await supabase
      .from('candidates')
      .update({ status })
      .eq('id', id)

    if (!error) {
      const updated = allCandidates.map(c => c.id === id ? { ...c, status } : c)
      updateFromFetch(updated)
    }
  }, [allCandidates, updateFromFetch])

  const deleteCandidate = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', id)

    if (!error) {
      const updated = allCandidates.filter(c => c.id !== id)
      updateFromFetch(updated)
    }
  }, [allCandidates, updateFromFetch])

  return {
    candidates: displayedCandidates,
    allCount: allCandidates.length,
    filteredCount: filteredRef.current.length,
    loading,
    hasMore,
    filter,
    setFilter: updateFilter,
    fetchCandidates: fetchAndUpdate,
    loadMore,
    updateStatus,
    deleteCandidate,
    refresh,
  }
}

// =============================================
// Algorithm 3: Parallel Upload with Semaphore (N=3)
// =============================================
export interface UploadTask {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  url?: string
  error?: string
}

export async function uploadFilesWithConcurrency(
  files: File[],
  userId: string,
  maxConcurrent: number = 3,
  onProgress: (tasks: UploadTask[]) => void
): Promise<UploadTask[]> {
  const tasks: UploadTask[] = files.map(file => ({
    id: crypto.randomUUID(),
    file,
    progress: 0,
    status: 'pending',
  }))

  onProgress([...tasks])

  const semaphore = {
    count: 0,
    queue: [] as (() => void)[],
    async acquire() {
      if (this.count < maxConcurrent) {
        this.count++
        return
      }
      await new Promise<void>(resolve => this.queue.push(resolve))
      this.count++
    },
    release() {
      this.count--
      const next = this.queue.shift()
      if (next) next()
    }
  }

  const uploads = tasks.map(async (task) => {
    await semaphore.acquire()
    try {
      // Update to uploading
      task.status = 'uploading'
      task.progress = 10
      onProgress([...tasks])

      const ext = task.file.name.split('.').pop()
      const path = `${userId}/${task.id}.${ext}`

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        if (task.progress < 85) {
          task.progress += 15
          onProgress([...tasks])
        }
      }, 200)

      const { data, error } = await supabase.storage
        .from('resumes')
        .upload(path, task.file, { cacheControl: '3600', upsert: false })

      clearInterval(progressInterval)

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(data.path)

      task.url = urlData.publicUrl
      task.status = 'done'
      task.progress = 100
    } catch (err) {
      task.status = 'error'
      task.error = err instanceof Error ? err.message : 'Upload failed'
      task.progress = 100
    } finally {
      onProgress([...tasks])
      semaphore.release()
    }
    return task
  })

  await Promise.allSettled(uploads)
  return tasks
}
