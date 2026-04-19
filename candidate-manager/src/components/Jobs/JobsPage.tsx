import { useState, useEffect } from 'react'
import { Loader2, Trash2, Plus, FileText, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Job } from '../../types'

interface Props {
  onPostJob?: () => void
  onViewDetail?: (id: string) => void
}

export default function JobsPage({ onPostJob, onViewDetail }: Props) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('jobs').select('*').order('created_at', { ascending: false })
      if (data) setJobs(data)
      setLoading(false)
    }
    load()

    const handleRefresh = () => load()
    window.addEventListener('jobs-updated', handleRefresh)
    return () => window.removeEventListener('jobs-updated', handleRefresh)
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá vị trí này?')) return
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (!error) {
      setJobs(jobs.filter(j => j.id !== id))
    } else {
      console.error('Delete job error:', error)
      alert('Không thể xoá job: ' + error.message)
    }
  }

  const handleView = (job: Job, e?: React.MouseEvent) => {
    e?.stopPropagation()
    onViewDetail?.(job.id)
  }

  const handleOpenJD = (job: Job, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (job.jd_url) {
      window.open(job.jd_url, '_blank')
    } else {
      alert('Không có file JD đính kèm cho vị trí này.')
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
           <div className="realtime-dot">● ACTIVE LISTINGS</div>
           <h1 className="page-title">Job Openings</h1>
           <p className="page-subtitle">Manage open positions and view OpenAI extracted requirements.</p>
        </div>
        <button className="btn btn-primary" onClick={onPostJob} id="post-job-btn">
          <Plus size={18} /> Post New Job
        </button>
      </div>

      <div className="filter-bar" style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 16, top: 12, color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tiêu đề vị trí..." 
            className="input" 
            style={{ paddingLeft: 42, width: '100%', borderRadius: 'var(--radius-full)' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          className="input" 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)}
          style={{ width: 180, borderRadius: 'var(--radius-full)' }}
        >
          <option value="All">Tất cả trạng thái</option>
          <option value="Open">Đang mở (Open)</option>
          <option value="Closed">Đã đóng (Closed)</option>
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Position Title</th>
              <th>Status</th>
              <th>OpenAI Extracted Skills</th>
              <th>Date Posted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.filter(j => {
              if (statusFilter !== 'All' && j.status !== statusFilter) return false;
              if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const titleMatch = j.title?.toLowerCase().includes(q);
                const summaryMatch = j.ai_summary?.toLowerCase().includes(q);
                const tags = Array.isArray(j.requirements?.tags) ? j.requirements.tags : [];
                const tagsMatch = tags.some((t: string) => t.toLowerCase().includes(q));
                return titleMatch || summaryMatch || tagsMatch;
              }
              return true;
            }).map(j => {
              const skills = Array.isArray(j.requirements?.required_skills) ? j.requirements.required_skills : []
              return (
                <tr key={j.id} className="hoverable" onClick={() => handleView(j)}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 15 }}>{j.title}</div>
                    {j.ai_summary && (
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {j.ai_summary}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${j.status.toLowerCase()}`}>{j.status.toUpperCase()}</span>
                  </td>
                  <td>
                    <div className="skills-gap">
                      {skills.slice(0, 3).map((s: string, i: number) => (
                        <span key={i} className="skill-tag">{s}</span>
                      ))}
                      {skills.length > 3 && <span className="skill-tag">+{skills.length - 3}</span>}
                      {skills.length === 0 && <span style={{ color: 'var(--text-muted)' }}>N/A</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 14 }}>{new Date(j.created_at).toLocaleDateString()}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => handleOpenJD(j, e)} title="Mở file gốc"><FileText size={16} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(j.id) }} style={{ color: 'var(--danger)' }} title="Xoá Job"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            
            {jobs.length === 0 && !loading && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No open jobs found. Click "Post Job" to add one.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>
                  <Loader2 size={24} className="spin" style={{ color: 'var(--primary)' }} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

