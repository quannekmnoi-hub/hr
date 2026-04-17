import { PieChart, Download } from 'lucide-react'
import { useAnalytics } from '../../hooks/useAnalytics'

export default function AnalyticsPage() {
  const { analytics, loading } = useAnalytics()

  if (loading || !analytics) return <div style={{ padding: 40 }}>Loading analytics...</div>

  // Generate fake Tech Roles distribution since we don't have enough real data yet
  const roles = [
    { name: 'UX Designer', score: 45, color: '#f472b6' },
    { name: 'FE Engineer', score: 30, color: '#a855f7' },
    { name: 'Product Lead', score: 25, color: '#0ea5e9' }
  ]

  return (
    <>
      <div className="page-header">
         <div>
            <h1 className="page-title">Talent Analytics</h1>
            <p className="page-subtitle">Real-time insights into your hiring funnel and candidate flow.</p>
         </div>
         <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-outline" style={{ background: 'var(--input-bg)' }}>Last 30 Days</button>
            <button className="btn" style={{ background: '#0ea5e9', color: 'white' }}>
              <Download size={16} /> Export PDF
            </button>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 24 }}>
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.05em', marginBottom: 12 }}>TOTAL PIPELINE</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}>
            <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1 }}>{analytics.total}</div>
            <div style={{ color: 'var(--info)', fontWeight: 600, fontSize: 14 }}>&uarr; 12%</div>
          </div>
          
          <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', gap: 2, marginBottom: 24 }}>
            <div style={{ flex: 4, background: '#f472b6' }} />
            <div style={{ flex: 3, background: '#a855f7' }} />
            <div style={{ flex: 2, background: '#0ea5e9' }} />
            <div style={{ flex: 1, background: '#f1f5f9' }} />
          </div>
          
          <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 13 }}>
            Active applications across all open roles
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            <h3 style={{ fontSize: 18 }}>Application Status</h3>
            <button className="btn btn-ghost btn-icon btn-sm"><PieChart size={16} /></button>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', marginTop: 40 }}>
            {analytics.statusRatio.map(({ status, count }) => (
              <div key={status} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>{count}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginTop: 8 }}>{status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-cols-2">
        <div className="card">
          <h3 style={{ fontSize: 18, marginBottom: 32 }}>Top 3 Active Roles</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
            {/* Fake Donut Chart */}
            <div style={{ position: 'relative', width: 180, height: 180, borderRadius: '50%', background: 'conic-gradient(#f472b6 0% 45%, #a855f7 45% 75%, #0ea5e9 75% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 140, height: 140, background: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>34%</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>TECH ROLES</div>
              </div>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {roles.map(r => (
                 <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                   <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color }} />
                   <div style={{ fontWeight: 600, flex: 1 }}>{r.name}</div>
                   <div style={{ color: 'var(--text-muted)' }}>{r.score}%</div>
                 </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18 }}>New Candidates <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 400 }}>(Last 7 Days)</span></h3>
            <a href="#" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>View All</a>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
             {analytics.recentCandidates.slice(0, 3).map(c => (
               <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--input-bg)', padding: 12, borderRadius: 12 }}>
                 <div className="avatar" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                   {c.full_name[0]}
                 </div>
                 <div style={{ flex: 1 }}>
                   <div style={{ fontWeight: 600 }}>{c.full_name}</div>
                   <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.applied_position}</div>
                 </div>
                 <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
               </div>
             ))}
             {analytics.recentCandidates.length === 0 && (
               <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No candidates added recently.</div>
             )}
          </div>
        </div>
      </div>
    </>
  )
}
