import { Users, Search, Loader2 } from 'lucide-react'
import type { Candidate, CandidateStatus, FilterOptions } from '../../types'
import CandidateCard from './CandidateCard'

interface Props {
  candidates: Candidate[]
  filteredCount: number
  allCount: number
  loading: boolean
  hasMore: boolean
  filter: FilterOptions
  onLoadMore: () => void
  onUpdateStatus: (id: string, status: CandidateStatus) => void
  onDelete: (id: string) => void
}

export default function CandidateList({
  candidates, filteredCount, allCount, loading, hasMore,
  filter, onLoadMore, onUpdateStatus, onDelete,
}: Props) {
  const isFiltering = !!(filter.search || filter.status || filter.position ||
    filter.dateFrom || filter.dateTo)

  return (
    <div className="candidates-section">
      <div className="candidates-header">
        <div className="candidates-count">
          Hiển thị <span>{candidates.length}</span>
          {isFiltering
            ? ` / ${filteredCount} kết quả (tổng ${allCount})`
            : ` / ${allCount} ứng viên`}
        </div>
        {loading && (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Loader2 size={14} className="spin" /> Đang tải...
          </span>
        )}
      </div>

      {candidates.length === 0 && !loading ? (
        <div className="empty-state">
          <div className="empty-icon">
            {isFiltering ? <Search size={52} strokeWidth={1.2} /> : <Users size={52} strokeWidth={1.2} />}
          </div>
          <div className="empty-title">
            {isFiltering ? 'Không tìm thấy kết quả' : 'Chưa có ứng viên nào'}
          </div>
          <div className="empty-desc">
            {isFiltering
              ? 'Thử thay đổi từ khóa hoặc bộ lọc'
              : 'Nhấn "Thêm ứng viên" để bắt đầu'}
          </div>
        </div>
      ) : (
        <>
          <div className="candidates-grid">
            {candidates.map(c => (
              <CandidateCard
                key={c.id}
                candidate={c}
                onUpdateStatus={onUpdateStatus}
                onDelete={onDelete}
              />
            ))}
          </div>

          {hasMore && (
            <div className="load-more-wrap">
              <button
                id="load-more-btn"
                className="btn btn-ghost"
                onClick={onLoadMore}
                disabled={loading}
              >
                {loading
                  ? <><Loader2 size={15} className="spin" /> Đang tải...</>
                  : 'Tải thêm ứng viên'
                }
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
