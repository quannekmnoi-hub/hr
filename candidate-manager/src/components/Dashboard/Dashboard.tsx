import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import Header from './Header'
import StatsPanel from './StatsPanel'
import FilterBar from './FilterBar'
import CandidateList from './CandidateList'
import AddCandidateModal from './AddCandidateModal'
import { useCandidates } from '../../hooks/useCandidates'
import { useRealtime } from '../../hooks/useRealtime'
import { useAnalytics } from '../../hooks/useAnalytics'

interface Props { user: User }

export default function Dashboard({ user }: Props) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [realtimeActive, setRealtimeActive] = useState(false)

  const {
    candidates, allCount, filteredCount, loading, hasMore,
    filter, setFilter, fetchCandidates, loadMore, updateStatus, deleteCandidate,
  } = useCandidates(user.id)

  const { analytics, loading: analyticsLoading, fetchAnalytics } = useAnalytics()

  // Initial fetch
  useEffect(() => {
    fetchCandidates()
    fetchAnalytics()
  }, [fetchCandidates, fetchAnalytics])

  // Realtime: re-fetch on any change
  const handleRealtimeUpdate = useCallback(() => {
    fetchCandidates()
    fetchAnalytics()
    setRealtimeActive(true)
  }, [fetchCandidates, fetchAnalytics])

  useRealtime(user.id, handleRealtimeUpdate)

  // Blink realtime indicator
  useEffect(() => {
    if (realtimeActive) {
      const t = setTimeout(() => setRealtimeActive(false), 3000)
      return () => clearTimeout(t)
    }
  }, [realtimeActive])

  const handleSuccess = useCallback(() => {
    fetchCandidates()
    fetchAnalytics()
  }, [fetchCandidates, fetchAnalytics])

  return (
    <div className="dashboard">
      <Header user={user} realtimeActive={realtimeActive} />

      <div className="dashboard-content">
        {/* Stats & Analytics */}
        <StatsPanel analytics={analytics} loading={analyticsLoading} />

        {/* Filter + Add */}
        <FilterBar
          filter={filter}
          onChange={setFilter}
          onAdd={() => setShowAddModal(true)}
        />

        {/* Candidate List */}
        <CandidateList
          candidates={candidates}
          allCount={allCount}
          filteredCount={filteredCount}
          loading={loading}
          hasMore={hasMore}
          filter={filter}
          onLoadMore={loadMore}
          onUpdateStatus={updateStatus}
          onDelete={deleteCandidate}
        />
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddCandidateModal
          userId={user.id}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
