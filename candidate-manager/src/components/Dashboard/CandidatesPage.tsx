import { useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { useCandidates } from '../../hooks/useCandidates'
import { useAnalytics } from '../../hooks/useAnalytics'
import { useRealtime } from '../../hooks/useRealtime'
import {
  Search, Loader2, FileText, User as UserIcon,
  Users, Briefcase, TrendingUp, CheckCircle2, Clock, XCircle
} from 'lucide-react'

interface Props {
  user: User
  onViewDetail: (id: string) => void
  onAddCandidate: () => void
}

// ─── STATUS CONFIG ───────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  New:          { color: '#8b5cf6', bg: '#ede9fe', icon: <Users size={18} />,        label: 'Mới' },
  Interviewing: { color: '#3b82f6', bg: '#dbeafe', icon: <Clock size={18} />,        label: 'Phỏng vấn' },
  Hired:        { color: '#10b981', bg: '#d1fae5', icon: <CheckCircle2 size={18} />, label: 'Đã tuyển' },
  Rejected:     { color: '#ef4444', bg: '#fee2e2', icon: <XCircle size={18} />,      label: 'Loại' },
}

// ─── MINI BAR CHART (Kinh nghiệm / Score) ───────────────────────
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 28, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

export default function CandidatesPage({ user, onViewDetail, onAddCandidate }: Props) {
  const { candidates, loading, hasMore, filter, setFilter, fetchCandidates, loadMore } = useCandidates(user.id)
  const { analytics, loading: analyticsLoading, fetchAnalytics } = useAnalytics()

  const handleRefresh = useCallback(() => { fetchCandidates(); fetchAnalytics() }, [fetchCandidates, fetchAnalytics])
  useRealtime(user.id, handleRefresh)

  useEffect(() => {
    fetchCandidates()
    fetchAnalytics()
    window.addEventListener('candidates-updated', handleRefresh)
    return () => window.removeEventListener('candidates-updated', handleRefresh)
  }, [fetchAnalytics, fetchCandidates, handleRefresh])

  const setF = (key: string, value: string) => setFilter({ ...filter, [key]: value })

  // Tính thống kê từ analytics
  const total = analytics?.total ?? 0
  const hired = analytics?.statusRatio.find(s => s.status === 'Hired')?.count ?? 0
  const interviewing = analytics?.statusRatio.find(s => s.status === 'Interviewing')?.count ?? 0
  const newCount = analytics?.statusRatio.find(s => s.status === 'New')?.count ?? 0
  const topPositions = analytics?.topPositions ?? []
  const maxPositionCount = topPositions.length > 0 ? topPositions[0].count : 1

  // Donut chart data từ statusRatio thực
  const statusColors: Record<string, string> = {
    New: '#8b5cf6', Interviewing: '#3b82f6',
    Hired: '#10b981', Rejected: '#ef4444'
  }

  // Tạo conic-gradient từ dữ liệu thực
  let donutGradient = 'conic-gradient('
  let cumulative = 0
  const donutSegments = analytics?.statusRatio ?? []
  donutSegments.forEach((seg, i) => {
    const pct = total > 0 ? (seg.count / total) * 100 : 0
    const color = statusColors[seg.status] || '#94a3b8'
    donutGradient += `${color} ${cumulative}% ${cumulative + pct}%`
    cumulative += pct
    if (i < donutSegments.length - 1) donutGradient += ', '
  })
  donutGradient += ')'
  if (donutSegments.length === 0) donutGradient = 'conic-gradient(#e2e8f0 0% 100%)'

  // Hire rate
  const hireRate = total > 0 ? Math.round((hired / total) * 100) : 0

  return (
    <>
      {/* ══ PAGE HEADER ══════════════════════════════════════════════ */}
      <div className="page-header">
        <div>
          <div className="realtime-dot">● LIVE</div>
          <h1 className="page-title">Tổng quan tuyển dụng</h1>
          <p className="page-subtitle">Theo dõi toàn bộ pipeline ứng viên và số liệu tuyển dụng theo thời gian thực.</p>
        </div>
        <button className="btn btn-primary" onClick={onAddCandidate}>
          <UserIcon size={16} /> Thêm ứng viên
        </button>
      </div>

      {/* ══ STAT CARDS ═══════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {/* Total */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>TỔNG ỨNG VIÊN</div>
            <div style={{ background: '#ede9fe', color: '#8b5cf6', padding: 7, borderRadius: 9, display: 'flex' }}><Users size={16} /></div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>
            {analyticsLoading ? '—' : total}
          </div>
          <div style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 600, marginTop: 6 }}>
            {newCount} mới chưa xử lý
          </div>
        </div>

        {/* Interviewing */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>ĐANG PHỎNG VẤN</div>
            <div style={{ background: '#dbeafe', color: '#3b82f6', padding: 7, borderRadius: 9, display: 'flex' }}><Clock size={16} /></div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>
            {analyticsLoading ? '—' : interviewing}
          </div>
          <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600, marginTop: 6 }}>
            đang trong quá trình
          </div>
        </div>

        {/* Hired */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>ĐÃ TUYỂN DỤNG</div>
            <div style={{ background: '#d1fae5', color: '#10b981', padding: 7, borderRadius: 9, display: 'flex' }}><CheckCircle2 size={16} /></div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>
            {analyticsLoading ? '—' : hired}
          </div>
          <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginTop: 6 }}>
            tỷ lệ tuyển: {hireRate}%
          </div>
        </div>

        {/* Jobs opened */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>VỊ TRÍ KHÁC NHAU</div>
            <div style={{ background: '#fff7ed', color: '#f59e0b', padding: 7, borderRadius: 9, display: 'flex' }}><Briefcase size={16} /></div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>
            {analyticsLoading ? '—' : topPositions.length > 0 ? analytics?.topPositions.length ?? 0 : 0}
          </div>
          <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, marginTop: 6 }}>
            vị trí phổ biến nhất
          </div>
        </div>
      </div>

      {/* ══ ANALYTICS CHARTS ══════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 28 }}>

        {/* Chart 1: Status Distribution (Donut) */}
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 20, color: 'var(--text)' }}>Phân bổ trạng thái</div>
          {analyticsLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Đang tải...</div>
          ) : total === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Chưa có dữ liệu</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {/* Donut */}
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                background: donutGradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, position: 'relative'
              }}>
                <div style={{
                  width: 68, height: 68, borderRadius: '50%',
                  background: 'white', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>{total}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>TỔNG</div>
                </div>
              </div>
              {/* Legend */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {donutSegments.map(seg => (
                  <div key={seg.status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: statusColors[seg.status] || '#94a3b8' }} />
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{STATUS_CONFIG[seg.status]?.label || seg.status}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: statusColors[seg.status] || '#94a3b8' }}>{seg.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chart 2: Top Positions (Horizontal Bars) */}
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 20, color: 'var(--text)' }}>Vị trí được ứng tuyển nhiều nhất</div>
          {analyticsLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Đang tải...</div>
          ) : topPositions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Chưa có dữ liệu</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {topPositions.map((pos, i) => {
                const barColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']
                const c = barColors[i % barColors.length]
                return (
                  <div key={pos.position}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }} title={pos.position}>
                        {pos.position.length > 22 ? pos.position.slice(0, 20) + '…' : pos.position}
                      </span>
                      <span style={{ fontWeight: 700, color: c }}>{pos.count} người</span>
                    </div>
                    <MiniBar value={pos.count} max={maxPositionCount} color={c} />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Chart 3: Recent Candidates */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Ứng viên gần đây</div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--input-bg)', padding: '3px 8px', borderRadius: 99 }}>7 ngày</span>
          </div>
          {analyticsLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Đang tải...</div>
          ) : (analytics?.recentCandidates.length ?? 0) === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
              <TrendingUp size={28} style={{ opacity: 0.2, marginBottom: 8 }} />
              <div>Chưa có ứng viên nào trong 7 ngày qua</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {analytics!.recentCandidates.slice(0, 4).map(c => {
                const cfg = STATUS_CONFIG[c.status]
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 10, background: 'var(--input-bg)',
                      cursor: 'pointer', transition: '0.15s'
                    }}
                    onClick={() => onViewDetail(c.id)}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: cfg?.bg || 'var(--primary-light)',
                      color: cfg?.color || 'var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 13
                    }}>
                      {c.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.applied_position}</div>
                    </div>
                    <span className={`badge badge-${c.status.toLowerCase()}`} style={{ fontSize: 10, flexShrink: 0 }}>{c.status}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ DIVIDER ══════════════════════════════════════════════════ */}
      <div style={{ borderBottom: '2px solid var(--border)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          fontSize: 13, fontWeight: 800, color: 'var(--primary)',
          background: 'var(--primary-light)', padding: '4px 14px', borderRadius: '8px 8px 0 0',
          borderBottom: '2px solid var(--primary)', marginBottom: -2
        }}>
          Danh sách ứng viên
        </span>
      </div>

      {/* ══ FILTER BAR ═══════════════════════════════════════════════ */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', top: 12, left: 16, color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ width: '100%', paddingLeft: 42, borderRadius: 'var(--radius-full)' }}
            placeholder="Tìm ứng viên, kỹ năng hoặc email..."
            value={filter.search}
            onChange={e => setF('search', e.target.value)}
          />
        </div>
        <input
          className="input"
          style={{ width: 180, borderRadius: 'var(--radius-full)' }}
          placeholder="Lọc theo vị trí..."
          value={filter.position}
          onChange={e => setF('position', e.target.value)}
        />
        <select className="input" style={{ width: 160, borderRadius: 'var(--radius-full)' }} value={filter.status} onChange={e => setF('status', e.target.value)}>
          <option value="">Trạng thái: Tất cả</option>
          <option value="New">Mới (New)</option>
          <option value="Interviewing">Phỏng vấn</option>
          <option value="Hired">Đã tuyển</option>
          <option value="Rejected">Loại</option>
        </select>
        <select className="input" style={{ width: 220, borderRadius: 'var(--radius-full)' }} value={filter.sortBy} onChange={e => setF('sortBy', e.target.value)}>
          <option value="matching_score">Sắp xếp: Điểm AI (Cao-Thấp)</option>
          <option value="created_at">Sắp xếp: Mới nhất</option>
          <option value="full_name">Sắp xếp: Tên (A-Z)</option>
        </select>
      </div>

      {/* ══ TABLE ════════════════════════════════════════════════════ */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Vị trí ứng tuyển</th>
              <th>Điểm phù hợp</th>
              <th>Trạng thái</th>
              <th>Ngày nộp</th>
              <th>Tài liệu</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map(c => {
              const score = c.matching_score ?? 0
              let scoreColor = '#a855f7'
              let scoreLabel = 'Trung bình'
              if (score >= 90) { scoreColor = '#FF1F8E'; scoreLabel = 'Xuất sắc' }
              else if (score >= 80) { scoreColor = '#3b82f6'; scoreLabel = 'Tốt' }
              else if (score < 50) { scoreColor = '#ef4444'; scoreLabel = 'Yếu' }

              return (
                <tr key={c.id} className="hoverable" onClick={() => onViewDetail(c.id)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="avatar" style={{ background: 'var(--primary-light)', color: 'var(--primary)', width: 40, height: 40 }}>
                        {c.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{c.full_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.email || 'Không có email'}</div>
                      </div>
                    </div>
                  </td>
                  <td><div style={{ fontWeight: 500 }}>{c.applied_position}</div></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 56, height: 6, background: 'var(--input-bg)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${score}%`, height: '100%', background: scoreColor }} />
                      </div>
                      <div style={{ fontWeight: 700, color: scoreColor, minWidth: 36 }}>{score}%</div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 3 }}>{scoreLabel}</div>
                  </td>
                  <td><span className={`badge badge-${c.status.toLowerCase()}`}>{c.status.toUpperCase()}</span></td>
                  <td><div style={{ fontSize: 13 }}>{new Date(c.created_at).toLocaleDateString('vi-VN')}</div></td>
                  <td>
                    {c.resume_url ? (
                      <a href={c.resume_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                        style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
                        <FileText size={15} /> CV
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>N/A</span>
                    )}
                  </td>
                </tr>
              )
            })}

            {candidates.length === 0 && !loading && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                  <Users size={32} style={{ opacity: 0.2, marginBottom: 10 }} />
                  <div>Không có ứng viên nào.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={loadMore} disabled={loading}>
            {loading ? <><Loader2 size={16} className="spin" /> Đang tải...</> : 'Tải thêm ứng viên'}
          </button>
        </div>
      )}
    </>
  )
}
