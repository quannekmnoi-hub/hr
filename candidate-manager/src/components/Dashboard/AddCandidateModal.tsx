import { useState, useRef, useCallback } from 'react'
import {
  X, User, Wrench, FileText, Upload, Save,
  AlertCircle, CheckCircle, Loader2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { uploadFilesWithConcurrency, type UploadTask } from '../../hooks/useCandidates'

interface Props {
  userId: string
  onClose: () => void
  onSuccess: () => void
}

const POSITION_SUGGESTIONS = [
  'Frontend Developer', 'Backend Developer', 'Fullstack Developer',
  'UI/UX Designer', 'DevOps Engineer', 'Data Engineer',
  'Mobile Developer', 'QA Engineer',
]

// =============================================
// Algorithm 5: Matching Score (client-side)
// score = (matching_skills / total_required) * 100
// =============================================
async function calcMatchingScore(appliedPosition: string, skills: string[]): Promise<number> {
  if (!skills.length) return 0
  const { data: jobReq } = await supabase
    .from('job_requirements')
    .select('required_skills')
    .ilike('position_name', `%${appliedPosition.trim()}%`)
    .maybeSingle()

  if (!jobReq?.required_skills) return 0
  const required = jobReq.required_skills as string[]
  const skillsLower = skills.map((s: string) => s.toLowerCase())
  const matchCount = required.filter((r: string) => skillsLower.includes(r.toLowerCase())).length
  return required.length > 0 ? Math.round((matchCount / required.length) * 100) : 0
}

export default function AddCandidateModal({ userId, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({ full_name: '', applied_position: '', notes: '' })
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const addSkill = (skill: string) => {
    const s = skill.trim()
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s])
    setSkillInput('')
  }
  const removeSkill = (s: string) => setSkills(prev => prev.filter(x => x !== s))

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(skillInput) }
    else if (e.key === 'Backspace' && !skillInput && skills.length > 0) {
      setSkills(prev => prev.slice(0, -1))
    }
  }

  const handleFiles = useCallback((files: File[]) => {
    const validFiles = files.filter(f =>
      ['application/pdf', 'application/msword',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
       'image/jpeg', 'image/png'].includes(f.type)
    ).slice(0, 5)

    if (validFiles.length === 0) {
      setError('Chỉ chấp nhận file PDF, Word, hoặc ảnh (tối đa 5 file)')
      return
    }
    // Algorithm 3: Parallel upload with semaphore N=3
    uploadFilesWithConcurrency(validFiles, userId, 3, setUploadTasks)
  }, [userId])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    handleFiles(Array.from(e.dataTransfer.files))
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(Array.from(e.target.files))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null)

    if (!form.full_name.trim()) { setError('Vui lòng nhập họ tên'); return }
    if (!form.applied_position.trim()) { setError('Vui lòng nhập vị trí ứng tuyển'); return }
    if (uploadTasks.some(t => t.status === 'uploading' || t.status === 'pending')) {
      setError('Đang upload file, vui lòng đợi...'); return
    }

    setLoading(true)
    try {
      // 1. Get resume URL from completed uploads
      const resume_url = uploadTasks.find(t => t.status === 'done')?.url ?? null

      // 2. Calculate matching score client-side (Algorithm 5)
      const matching_score = await calcMatchingScore(form.applied_position, skills)

      // 3. Insert directly via Supabase client (RLS handles user_id auth)
      const { error: insertError } = await supabase
        .from('candidates')
        .insert({
          user_id: userId,
          full_name: form.full_name.trim(),
          applied_position: form.applied_position.trim(),
          resume_url,
          skills,
          notes: form.notes.trim() || null,
          matching_score,
          status: 'New',
        })

      if (insertError) throw insertError

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const doneCount  = uploadTasks.filter(t => t.status === 'done').length
  const errorCount = uploadTasks.filter(t => t.status === 'error').length

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" id="add-candidate-modal">
        <div className="modal-header">
          <h2 className="modal-title">Thêm hồ sơ ứng viên</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} id="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="auth-error" style={{ marginBottom: 16 }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            {/* Basic Info */}
            <div className="form-section-title">
              <User size={14} /> Thông tin cơ bản
            </div>
            <div className="form-grid-2">
              <div className="input-group">
                <label className="input-label" htmlFor="candidate-name">Họ và tên *</label>
                <input
                  id="candidate-name" type="text" className="input"
                  placeholder="Nguyễn Văn A"
                  value={form.full_name}
                  onChange={e => set('full_name', e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="candidate-position">Vị trí ứng tuyển *</label>
                <input
                  id="candidate-position" type="text" className="input"
                  placeholder="Frontend Developer"
                  value={form.applied_position}
                  onChange={e => set('applied_position', e.target.value)}
                  list="position-list" required
                />
                <datalist id="position-list">
                  {POSITION_SUGGESTIONS.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
            </div>

            {/* Skills */}
            <div className="form-section-title" style={{ marginTop: 20 }}>
              <Wrench size={14} /> Kỹ năng
            </div>
            <div
              className="skills-input-wrap"
              onClick={() => document.getElementById('skill-text-input')?.focus()}
            >
              {skills.map(skill => (
                <span key={skill} className="skill-chip">
                  {skill}
                  <button
                    type="button" className="skill-chip-remove"
                    onClick={e => { e.stopPropagation(); removeSkill(skill) }}
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}
              <input
                id="skill-text-input" type="text" className="skills-text-input"
                placeholder={skills.length === 0 ? 'React, TypeScript, Node.js...' : ''}
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                onBlur={() => skillInput && addSkill(skillInput)}
              />
            </div>
            <div className="skills-hint">Nhấn Enter hoặc dấu phẩy để thêm kỹ năng</div>

            {/* Notes */}
            <div className="form-section-title" style={{ marginTop: 20 }}>
              <FileText size={14} /> Ghi chú
            </div>
            <div className="input-group">
              <textarea
                id="candidate-notes" className="input"
                placeholder="Ghi chú thêm về ứng viên..."
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={3}
              />
            </div>

            {/* Upload CV */}
            <div className="form-section-title" style={{ marginTop: 20 }}>
              <Upload size={14} /> Upload CV
              <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11 }}>
                (tối đa 5 file, upload song song N=3)
              </span>
            </div>
            <div
              className={`upload-zone${dragging ? ' dragging' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              id="upload-zone"
            >
              <div className="upload-icon">
                <Upload size={32} strokeWidth={1.4} />
              </div>
              <div className="upload-text">
                Kéo thả file vào đây hoặc <strong>click để chọn</strong>
              </div>
              <div className="upload-hint">PDF, Word, Ảnh — tối đa 5 file</div>
              <input
                ref={fileInputRef} type="file" className="upload-input"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                multiple onChange={handleFileInput} id="file-input"
              />
            </div>

            {/* Upload Progress (Algorithm 3) */}
            {uploadTasks.length > 0 && (
              <div className="upload-progress-list">
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                  Upload song song (max 3): {doneCount}/{uploadTasks.length} hoàn thành
                  {errorCount > 0 && ` • ${errorCount} lỗi`}
                </div>
                {uploadTasks.map(task => (
                  <div key={task.id} className="upload-progress-item">
                    <div className="upload-progress-header">
                      <span className="upload-file-name">{task.file.name}</span>
                      <span className={`upload-status-text upload-status-${task.status}`}>
                        {task.status === 'pending'   && <><Loader2 size={11} /> Chờ</>}
                        {task.status === 'uploading' && <><Loader2 size={11} className="spin" /> Uploading</>}
                        {task.status === 'done'      && <><CheckCircle size={11} /> Xong</>}
                        {task.status === 'error'     && <><AlertCircle size={11} /> Lỗi</>}
                      </span>
                    </div>
                    <div className="upload-progress-bar">
                      <div
                        className={`upload-progress-fill ${task.status}`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    {task.error && (
                      <div style={{ fontSize: 11, color: 'var(--rejected)', marginTop: 3 }}>
                        {task.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} id="cancel-btn">
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="submit-candidate-btn">
              {loading
                ? <><Loader2 size={15} className="spin" /> Đang lưu...</>
                : <><Save size={15} /> Lưu hồ sơ</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
