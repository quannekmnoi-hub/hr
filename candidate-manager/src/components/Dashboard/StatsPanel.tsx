import {
  Users, UserCheck, Clock, Briefcase,
  BarChart2, TrendingUp, Medal,
} from 'lucide-react'
import type { AnalyticsData } from '../../types'

const STATUS_COLORS: Record<string, string> = {
  New:          '#3b82f6',
  Interviewing: '#f59e0b',
  Hired:        '#10b981',
  Rejected:     '#ef4444',
}

interface Props {
  analytics: AnalyticsData | null
  loading: boolean
}

export default function StatsPanel({ analytics, loading }: Props) {
  if (loading) {
    return (
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card" style={{ opacity: 0.5 }}>
            <div className="stat-icon blue" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-inset-sm)' }} />
            <div className="stat-value" style={{ color: 'var(--text-muted)' }}>—</div>
            <div className="stat-label">Đang tải...</div>
          </div>
        ))}
      </div>
    )
  }

  const stats = [
    {
      icon: <Users size={20} />, iconClass: 'blue',
      value: analytics?.total ?? 0,
      label: 'Tổng ứng viên',
    },
    {
      icon: <Clock size={20} />, iconClass: 'purple',
      value: analytics?.recentCount ?? 0,
      label: '7 ngày gần đây',
    },
    {
      icon: <UserCheck size={20} />, iconClass: 'green',
      value: analytics?.statusRatio.find(s => s.status === 'Hired')?.count ?? 0,
      label: 'Đã tuyển',
    },
    {
      icon: <Briefcase size={20} />, iconClass: 'orange',
      value: analytics?.statusRatio.find(s => s.status === 'Interviewing')?.count ?? 0,
      label: 'Đang phỏng vấn',
    },
  ]

  return (
    <>
      {/* Stat Cards */}
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.iconClass}`}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status Distribution */}
      {analytics && analytics.statusRatio.length > 0 && (
        <div className="status-bars-card">
          <div className="status-bars-title">
            <BarChart2 size={16} /> Phân bố trạng thái

            {analytics.topPositions.length > 0 && (
              <div className="top-positions-row" style={{ marginLeft: 'auto', marginBottom: 0 }}>
                <TrendingUp size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                {analytics.topPositions.map((p, i) => (
                  <div key={p.position} className="top-position-chip">
                    <span className="top-position-rank">
                      {i === 0 ? <Medal size={11} /> : `#${i + 1}`}
                    </span>
                    <span className="top-position-name">{p.position}</span>
                    <span className="top-position-count">({p.count})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {analytics.statusRatio.map(({ status, count, ratio }) => (
            <div key={status} className="status-bar-item">
              <span className="status-bar-name">{status}</span>
              <div className="status-bar-track">
                <div
                  className="status-bar-fill"
                  style={{ width: `${ratio}%`, background: STATUS_COLORS[status] ?? '#6366f1' }}
                />
              </div>
              <span className="status-bar-count">{count}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
