import { Search, Filter, Calendar, Briefcase, Plus, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { FilterOptions, CandidateStatus } from '../../types'

interface Props {
  filter: FilterOptions
  onChange: (f: FilterOptions) => void
  onAdd: () => void
}

const STATUSES: Array<{ value: CandidateStatus | ''; label: string }> = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'New', label: 'New' },
  { value: 'Interviewing', label: 'Interviewing' },
  { value: 'Hired', label: 'Hired' },
  { value: 'Rejected', label: 'Rejected' },
]

const SORT_OPTIONS = [
  { value: 'created_at',     label: 'Ngày tạo' },
  { value: 'full_name',      label: 'Tên A-Z' },
  { value: 'matching_score', label: 'Matching Score' },
]

export default function FilterBar({ filter, onChange, onAdd }: Props) {
  const set = (key: keyof FilterOptions, value: string) => {
    onChange({ ...filter, [key]: value })
  }

  const reset = () => {
    onChange({
      search: '', status: '', position: '',
      dateFrom: '', dateTo: '',
      sortBy: 'created_at', sortOrder: 'desc',
    })
  }

  const hasActiveFilter = filter.search || filter.status || filter.position ||
    filter.dateFrom || filter.dateTo

  const SortIcon = filter.sortOrder === 'desc' ? ArrowDown : ArrowUp

  return (
    <div className="toolbar">
      <div className="toolbar-filters">
        {/* Search */}
        <div className="filter-group" style={{ minWidth: 220 }}>
          <span className="filter-label">Tìm kiếm (Fuzzy)</span>
          <div className="input-wrap">
            <span className="input-icon"><Search size={14} /></span>
            <input
              id="filter-search"
              type="text"
              className="input with-icon"
              placeholder="Tên, vị trí, kỹ năng..."
              value={filter.search}
              onChange={e => set('search', e.target.value)}
            />
          </div>
        </div>

        {/* Status */}
        <div className="filter-group">
          <span className="filter-label">Trạng thái</span>
          <div className="input-wrap">
            <span className="input-icon"><Filter size={14} /></span>
            <select
              id="filter-status"
              className="input with-icon"
              value={filter.status}
              onChange={e => set('status', e.target.value)}
            >
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Position */}
        <div className="filter-group">
          <span className="filter-label">Vị trí</span>
          <div className="input-wrap">
            <span className="input-icon"><Briefcase size={14} /></span>
            <input
              id="filter-position"
              type="text"
              className="input with-icon"
              placeholder="Vị trí ứng tuyển..."
              value={filter.position}
              onChange={e => set('position', e.target.value)}
            />
          </div>
        </div>

        {/* Date From */}
        <div className="filter-group">
          <span className="filter-label">Từ ngày</span>
          <div className="input-wrap">
            <span className="input-icon"><Calendar size={14} /></span>
            <input
              id="filter-date-from"
              type="date"
              className="input with-icon"
              value={filter.dateFrom}
              onChange={e => set('dateFrom', e.target.value)}
            />
          </div>
        </div>

        {/* Date To */}
        <div className="filter-group">
          <span className="filter-label">Đến ngày</span>
          <div className="input-wrap">
            <span className="input-icon"><Calendar size={14} /></span>
            <input
              id="filter-date-to"
              type="date"
              className="input with-icon"
              value={filter.dateTo}
              onChange={e => set('dateTo', e.target.value)}
            />
          </div>
        </div>

        {/* Sort */}
        <div className="filter-group">
          <span className="filter-label">Sắp xếp</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <div className="input-wrap" style={{ flex: 1 }}>
              <span className="input-icon"><ArrowUpDown size={14} /></span>
              <select
                id="filter-sort-by"
                className="input with-icon"
                value={filter.sortBy}
                onChange={e => set('sortBy', e.target.value)}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <button
              id="filter-sort-order-btn"
              className="btn btn-ghost btn-sm"
              onClick={() => set('sortOrder', filter.sortOrder === 'desc' ? 'asc' : 'desc')}
              title="Đổi chiều sắp xếp"
              style={{ padding: '0 12px', flexShrink: 0 }}
            >
              <SortIcon size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="toolbar-actions">
        {hasActiveFilter && (
          <button id="filter-reset-btn" className="btn btn-ghost btn-sm" onClick={reset}>
            <X size={14} /> Xóa lọc
          </button>
        )}
        <button id="add-candidate-btn" className="btn btn-primary" onClick={onAdd}>
          <Plus size={16} /> Thêm ứng viên
        </button>
      </div>
    </div>
  )
}
