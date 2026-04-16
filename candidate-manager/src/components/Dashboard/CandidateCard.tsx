import { Briefcase, Calendar, FileText, Trash2, Target } from 'lucide-react'
import type { Candidate, CandidateStatus } from '../../types'

interface Props {
  candidate: Candidate
  onUpdateStatus: (id: string, status: CandidateStatus) => void
  onDelete: (id: string) => void
}

const STATUSES: CandidateStatus[] = ['New', 'Interviewing', 'Hired', 'Rejected']

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export default function CandidateCard({ candidate: c, onUpdateStatus, onDelete }: Props) {
  const initials = c.full_name
    .split(' ')
    .map((w: string) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  const score = Math.round(c.matching_score ?? 0)

  return (
    <div className="candidate-card" id={`candidate-card-${c.id}`}>
      {/* Header */}
      <div className="candidate-card-header">
        <div className="candidate-avatar">{initials}</div>
        <div className="candidate-info">
          <div className="candidate-name" title={c.full_name}>{c.full_name}</div>
          <div className="candidate-position">
            <Briefcase size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            {c.applied_position}
          </div>
        </div>
        <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
      </div>

      {/* Score */}
      <div className="candidate-card-meta">
        <div className="candidate-score">
          <Target size={13} />
          <span>Match:</span>
          <div className="score-bar">
            <div className="score-bar-fill" style={{ width: `${score}%` }} />
          </div>
          <span style={{ color: score >= 70 ? 'var(--hired)' : score >= 40 ? 'var(--interviewing)' : 'var(--rejected)' }}>
            {score}%
          </span>
        </div>
        <div className="candidate-date">
          <Calendar size={12} /> {formatDate(c.created_at)}
        </div>
      </div>

      {/* Skills */}
      {c.skills && c.skills.length > 0 && (
        <div className="candidate-skills">
          {c.skills.slice(0, 5).map((skill: string) => (
            <span key={skill} className="skill-tag">{skill}</span>
          ))}
          {c.skills.length > 5 && (
            <span className="skill-tag" style={{ color: 'var(--text-muted)' }}>
              +{c.skills.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Notes */}
      {c.notes && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {c.notes.length > 80 ? c.notes.slice(0, 80) + '...' : c.notes}
        </div>
      )}

      {/* Actions */}
      <div className="candidate-actions">
        <select
          id={`status-select-${c.id}`}
          className="status-select"
          value={c.status}
          onChange={e => onUpdateStatus(c.id, e.target.value as CandidateStatus)}
          title="Cập nhật trạng thái"
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {c.resume_url && (
          <a
            href={c.resume_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm btn-icon"
            title="Xem CV"
            id={`view-cv-${c.id}`}
          >
            <FileText size={15} />
          </a>
        )}

        <button
          className="btn btn-danger btn-sm btn-icon"
          onClick={() => {
            if (confirm(`Xóa hồ sơ "${c.full_name}"?`)) onDelete(c.id)
          }}
          title="Xóa ứng viên"
          id={`delete-candidate-${c.id}`}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}
