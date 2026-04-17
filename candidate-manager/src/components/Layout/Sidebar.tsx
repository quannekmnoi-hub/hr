import { Users, Briefcase, Plus } from 'lucide-react'

import {
  CANDIDATES_PATH,
  JOB_NEW_PATH,
  JOBS_PATH,
  type AppSection,
} from '../../lib/router'

interface Props {
  currentSection: AppSection | null
  onNavigate: (path: string) => void
}

export default function Sidebar({ currentSection, onNavigate }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span style={{ color: 'var(--primary)' }}>HR</span>
        <span style={{ color: 'var(--text)' }}>Core</span>
      </div>

      <div style={{ padding: '0 16px', marginBottom: 24 }}>
        <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 16 }}>Recruitment</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Manage Talent</div>
      </div>

      <nav className="sidebar-nav">
        <button
          type="button"
          className={`nav-item ${currentSection === 'candidates' ? 'active' : ''}`}
          onClick={() => onNavigate(CANDIDATES_PATH)}
          style={{ width: '100%', background: 'transparent', textAlign: 'left' }}
        >
          <Users size={18} /> Candidates
        </button>
        <button
          type="button"
          className={`nav-item ${currentSection === 'jobs' ? 'active' : ''}`}
          onClick={() => onNavigate(JOBS_PATH)}
          style={{ width: '100%', background: 'transparent', textAlign: 'left' }}
        >
          <Briefcase size={18} /> Jobs
        </button>
      </nav>

      <div style={{ padding: 16 }}>
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={() => onNavigate(JOB_NEW_PATH)}
        >
          <Plus size={16} /> Post Job
        </button>
      </div>
    </aside>
  )
}
