import { useState, useRef, useCallback } from 'react'
import {
  X, Upload, AlertCircle, Sparkles, Brain,
  User, Mail, Phone, MapPin, Link2, FileText, PenLine,
  ChevronRight, CheckCircle2, Save, Loader2
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { uploadFilesWithConcurrency, type UploadTask } from '../../hooks/useCandidates'
import { analyzeCV, extractSimpleSkills, extractTextFromFile } from '../../lib/ai'
import { useTasks } from '../../contexts/TaskContext'

interface Props {
  userId: string
  onClose: () => void
  onSuccess: () => void
}

type InputMode = 'choose' | 'manual' | 'ai'

const POSITION_SUGGESTIONS = [
  'Frontend Developer', 'Backend Developer', 'Full-stack Developer',
  'Product Manager', 'UX Designer', 'Data Engineer', 'DevOps Engineer',
  'Mobile Developer', 'QA Engineer', 'Business Analyst', 'Sales Executive',
  'Marketing Manager', 'HR Specialist', 'Accountant', 'Project Manager'
]

interface ManualForm {
  full_name: string
  email: string
  phone: string
  gender: string
  date_of_birth: string
  location: string
  linkedin: string
  portfolio: string
  applied_position: string
  notes: string
}

const EMPTY: ManualForm = {
  full_name: '', email: '', phone: '', gender: '', date_of_birth: '',
  location: '', linkedin: '', portfolio: '', applied_position: '', notes: ''
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return typeof error === 'string' ? error : 'Có lỗi xảy ra'
}

export default function AddCandidateModal({ userId, onClose, onSuccess }: Props) {
  const { addTask, updateTask } = useTasks()
  const [mode, setMode] = useState<InputMode>('choose')

  // ── Manual mode state ──────────────────────────────────────────────────────
  const [form, setForm] = useState<ManualForm>(EMPTY)
  const [manualUploadTasks, setManualUploadTasks] = useState<UploadTask[]>([])
  const [manualLoading, setManualLoading] = useState(false)
  const manualFileRef = useRef<HTMLInputElement>(null)

  // ── AI mode state ──────────────────────────────────────────────────────────
  const [aiFile, setAiFile] = useState<File | null>(null)
  const aiFileRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof ManualForm, value: string) =>
    setForm(f => ({ ...f, [key]: value }))

  // ─── File handler: manual optional CV ─────────────────────────────────────
  const handleManualFiles = useCallback((files: File[]) => {
    const valid = files.filter(f =>
      ['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg', 'image/png'].includes(f.type)
    ).slice(0, 1)
    if (!valid.length) { setError('Chỉ chấp nhận PDF, Word hoặc ảnh'); return }
    setError(null)
    uploadFilesWithConcurrency(valid, userId, 1, setManualUploadTasks)
  }, [userId])

  // ─── File handler: AI CV upload ────────────────────────────────────────────
  const handleAiFiles = useCallback((files: File[]) => {
    const valid = files.find(f =>
      ['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg', 'image/png'].includes(f.type) ||
      f.name.match(/\.(pdf|doc|docx|jpg|jpeg|png)$/i)
    )
    if (!valid) { setError('Chỉ chấp nhận PDF, Word hoặc ảnh'); return }
    setError(null)
    setAiFile(valid)
  }, [])

  // ─── SUBMIT MANUAL — lưu thẳng, không AI (Có Loading bình thường) ─────────
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null)

    if (!form.full_name.trim()) {
      setError('Vui lòng nhập họ tên ứng viên'); return
    }
    if (!form.applied_position.trim()) {
      setError('Vui lòng nhập vị trí ứng tuyển'); return
    }
    if (manualUploadTasks.some(t => t.status === 'uploading' || t.status === 'pending')) {
      setError('Đang upload file CV, vui lòng chờ...'); return
    }

    setManualLoading(true)
    try {
      const resume_url = manualUploadTasks.find(t => t.status === 'done')?.url ?? null

      const payload = {
        user_id: userId,
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        location: form.location.trim() || null,
        linkedin_url: form.linkedin.trim() || null,
        portfolio_url: form.portfolio.trim() || null,
        applied_position: form.applied_position.trim(),
        resume_url,
        notes: form.notes.trim() || null,
        status: 'New',
        skills: [],
        ai_analysis: null,
        matching_score: 0,
      }
      console.log('Candidate Manual Insert Payload:', payload)

      const { error: insertError } = await supabase.functions.invoke('add-candidate', {
        body: payload,
      })

      if (insertError) throw insertError
      onSuccess(); onClose()
    } catch (err: unknown) {
      console.error('Candidate Manual Insert Error:', err)
      setError(getErrorMessage(err))
    } finally {
      setManualLoading(false)
    }
  }

  // ─── SUBMIT AI — CHẠY NGẦM ──────────────────────────────────────────────────
  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null)

    if (!aiFile) {
      setError('Vui lòng upload file CV để AI phân tích'); return
    }

    const fileToProcess = aiFile

    // Đóng form ngay lập tức & đưa vào background task
    onClose()
    
    const taskId = crypto.randomUUID()
    addTask(taskId, `Phân tích CV: ${fileToProcess.name}`, 'Đang chuẩn bị upload...')

    try {
      // Step 1: Upload file lên Supabase Storage
      updateTask(taskId, { progress: 10, subtitle: 'Đang upload file CV lên hệ thống...' })
      const uploadResult = await new Promise<UploadTask[]>((resolve) => {
        uploadFilesWithConcurrency([fileToProcess], userId, 1, tasks => {
          if (tasks.length > 0) {
            updateTask(taskId, { progress: 10 + (tasks[0].progress * 0.2) }) 
          }
          if (tasks[0]?.status === 'done' || tasks[0]?.status === 'error') {
            resolve(tasks)
          }
        })
      })
      const resume_url = uploadResult.find(t => t.status === 'done')?.url ?? null

      // Step 2: Extract text từ file
      updateTask(taskId, { progress: 30, subtitle: 'Đang trích xuất văn bản từ CV...' })
      const extracted = await extractTextFromFile(fileToProcess)

      // Step 3: AI phân tích
      updateTask(taskId, { progress: 50, subtitle: 'AI đang phân tích kỹ năng và kinh nghiệm...' })
      const ai_analysis = await analyzeCV({
        resumeText: extracted.text,
        resumeImage: extracted.image,
      })

      if (!ai_analysis) {
        throw new Error('AI không trả về dữ liệu. Kiểm tra AI server tại port 8045.')
      }

      // Step 4: Lưu vào DB
      updateTask(taskId, { progress: 80, subtitle: 'Đang lưu hồ sơ ứng viên...' })
      const skills = extractSimpleSkills(ai_analysis)

      const contact = ai_analysis?.contact_info || {}

      const payload = {
        user_id: userId,
        full_name: (ai_analysis?.full_name || contact?.name || 'Candidate').trim(),
        email: contact?.email || null,
        phone: contact?.phone || null,
        gender: contact?.gender || null,
        date_of_birth: contact?.date_of_birth || null,
        location: contact?.location || ai_analysis?.location || null,
        linkedin_url: contact?.linkedin || null,
        portfolio_url: contact?.portfolio || null,
        applied_position: (
          ai_analysis?.job_function ||
          ai_analysis?.domain ||
          'To be determined'
        ).trim(),
        resume_url,
        notes: null,
        status: 'New',
        skills,
        ai_analysis,
        matching_score: 0,
      }
      console.log('Candidate AI Insert Payload:', payload)

      const { error: insertError } = await supabase.functions.invoke('add-candidate', {
        body: payload,
      })

      if (insertError) throw insertError

      updateTask(taskId, { progress: 100, status: 'success', subtitle: 'Hoàn tất phân tích CV' })
      onSuccess()
      window.dispatchEvent(new CustomEvent('candidates-updated'))
      
      // setTimeout refresh the background task badge if needed
    } catch (err: unknown) {
      console.error('Candidate AI Insert Error:', err)
      const errorMsg = getErrorMessage(err)
      updateTask(taskId, { status: 'error', error: errorMsg, subtitle: 'Lỗi khi phân tích/lưu' })
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'var(--primary)', color: 'white', padding: '6px', borderRadius: 8 }}>
              <Brain size={18} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: 22 }}>New Candidate Profile</h2>
              {mode !== 'choose' && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {mode === 'manual' ? '✏️ Nhập thủ công' : '🤖 AI phân tích CV ngầm'}
                  <button
                    type="button"
                    onClick={() => { setMode('choose'); setError(null) }}
                    style={{ marginLeft: 8, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  >
                    Đổi phương thức
                  </button>
                </div>
              )}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} id="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        {/* ════ CHOOSE MODE ════════════════════════════════════════════════════ */}
        {mode === 'choose' && (
          <div className="modal-body">
            <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: 14, textAlign: 'center' }}>
              Chọn cách thêm hồ sơ ứng viên vào hệ thống
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Option 1: Manual */}
              <button
                type="button"
                onClick={() => setMode('manual')}
                style={{
                  padding: 28, border: '2px solid var(--primary-light)', borderRadius: 20,
                  background: 'white', cursor: 'pointer', textAlign: 'left', transition: '0.2s',
                  display: 'flex', flexDirection: 'column', gap: 12
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'
                  ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 var(--primary-light)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary-light)'
                  ;(e.currentTarget as HTMLElement).style.transform = ''
                  ;(e.currentTarget as HTMLElement).style.boxShadow = ''
                }}
                id="mode-manual-btn"
              >
                <div style={{
                  background: 'var(--primary-light)', width: 48, height: 48, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
                }}>
                  <PenLine size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: 'var(--text)' }}>
                    Nhập thủ công
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Tự điền đầy đủ thông tin: tên, liên hệ, vị trí, ghi chú. Đính kèm file CV nếu có.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                  Chọn <ChevronRight size={14} />
                </div>
              </button>

              {/* Option 2: AI Upload */}
              <button
                type="button"
                onClick={() => setMode('ai')}
                style={{
                  padding: 28, border: '2px solid var(--primary-light)', borderRadius: 20,
                  background: 'white', cursor: 'pointer', textAlign: 'left', transition: '0.2s',
                  display: 'flex', flexDirection: 'column', gap: 12
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'
                  ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 var(--primary-light)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary-light)'
                  ;(e.currentTarget as HTMLElement).style.transform = ''
                  ;(e.currentTarget as HTMLElement).style.boxShadow = ''
                }}
                id="mode-ai-btn"
              >
                <div style={{
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  width: 48, height: 48, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                }}>
                  <Sparkles size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: 'var(--text)' }}>
                    AI phân tích CV
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Chỉ cần upload file CV — AI sẽ chạy ngầm và tự điền toàn bộ thông tin.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                  Chọn <ChevronRight size={14} />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ════ MANUAL MODE ════════════════════════════════════════════════════ */}
        {mode === 'manual' && (
          <form onSubmit={handleManualSubmit}>
            <div className="modal-body">
              {error && (
                <div className="auth-error" style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} /> {error}
                </div>
              )}

              <SectionLabel icon={<User size={14} />} label="Thông tin cơ bản" />
              <div className="grid-cols-2">
                <div className="input-group">
                  <label className="input-label" htmlFor="m-name">Họ & Tên <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input id="m-name" type="text" className="input" placeholder="VD: Nguyễn Văn An"
                    value={form.full_name} onChange={e => set('full_name', e.target.value)} required disabled={manualLoading} />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="m-position">Vị trí ứng tuyển <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input id="m-position" type="text" className="input" placeholder="VD: Backend Developer"
                    value={form.applied_position} onChange={e => set('applied_position', e.target.value)}
                    list="m-position-list" required disabled={manualLoading} />
                  <datalist id="m-position-list">
                    {POSITION_SUGGESTIONS.map(p => <option key={p} value={p} />)}
                  </datalist>
                </div>
              </div>

              <SectionLabel icon={<Phone size={14} />} label="Thông tin liên hệ" />
              <div className="grid-cols-2">
                <div className="input-group">
                  <label className="input-label" htmlFor="m-email">Email</label>
                  <InputWithIcon icon={<Mail size={15} />}>
                    <input id="m-email" type="email" className="input" placeholder="email@example.com"
                      value={form.email} onChange={e => set('email', e.target.value)} disabled={manualLoading} />
                  </InputWithIcon>
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="m-phone">Số điện thoại</label>
                  <InputWithIcon icon={<Phone size={15} />}>
                    <input id="m-phone" type="tel" className="input" placeholder="VD: 0901234567"
                      value={form.phone} onChange={e => set('phone', e.target.value)} disabled={manualLoading} />
                  </InputWithIcon>
                </div>
              </div>
              <div className="grid-cols-2">
                <div className="input-group">
                  <label className="input-label" htmlFor="m-dob">Ngày sinh</label>
                  <input id="m-dob" type="date" className="input"
                    value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} disabled={manualLoading} />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="m-gender">Giới tính</label>
                  <select id="m-gender" className="input"
                    value={form.gender} onChange={e => set('gender', e.target.value)} disabled={manualLoading}>
                    <option value="">-- Chọn giới tính --</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>
              <div className="grid-cols-2">
                <div className="input-group">
                  <label className="input-label" htmlFor="m-location">Địa chỉ / Nơi ở</label>
                  <InputWithIcon icon={<MapPin size={15} />}>
                    <input id="m-location" type="text" className="input" placeholder="VD: Hồ Chí Minh"
                      value={form.location} onChange={e => set('location', e.target.value)} disabled={manualLoading} />
                  </InputWithIcon>
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="m-linkedin">LinkedIn URL</label>
                  <InputWithIcon icon={<Link2 size={15} />}>
                    <input id="m-linkedin" type="url" className="input" placeholder="linkedin.com/in/..."
                      value={form.linkedin} onChange={e => set('linkedin', e.target.value)} disabled={manualLoading} />
                  </InputWithIcon>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="m-portfolio">Portfolio / Website</label>
                <InputWithIcon icon={<Link2 size={15} />}>
                  <input id="m-portfolio" type="url" className="input" placeholder="VD: github.com/username"
                    value={form.portfolio} onChange={e => set('portfolio', e.target.value)} disabled={manualLoading} />
                </InputWithIcon>
              </div>

              <SectionLabel icon={<FileText size={14} />} label="Ghi chú & thông tin thêm" />
              <div className="input-group">
                <label className="input-label" htmlFor="m-notes">Ghi chú về ứng viên</label>
                <textarea id="m-notes" className="input"
                  placeholder={`Ghi chú thêm về ứng viên:\n- Kinh nghiệm làm việc\n- Kỹ năng nổi bật\n- Nhận xét buổi phỏng vấn...\n- v.v.`}
                  value={form.notes} onChange={e => set('notes', e.target.value)} rows={4} disabled={manualLoading} />
              </div>

              {/* Optional CV file attachment */}
              <SectionLabel icon={<Upload size={14} />} label="Đính kèm file CV" />
              <ManualUploadZone
                uploadTasks={manualUploadTasks}
                loading={manualLoading}
                fileInputRef={manualFileRef}
                onFiles={handleManualFiles}
              />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={manualLoading}>Huỷ</button>
              <button type="submit" className="btn btn-primary" disabled={manualLoading} style={{ padding: '12px 28px' }}>
                {manualLoading
                  ? <><span className="spin"><Loader2 size={16} /></span> Đang lưu...</>
                  : <><Save size={16} /> Lưu hồ sơ</>
                }
              </button>
            </div>
          </form>
        )}

        {/* ════ AI UPLOAD MODE ══════════════════════════════════════════════════ */}
        {mode === 'ai' && (
          <form onSubmit={handleAiSubmit}>
            <div className="modal-body">
              {error && (
                <div className="auth-error" style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} /> {error}
                </div>
              )}

              <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
                Upload file CV — <strong>AI Engine v2.0</strong> sẽ chạy ngầm và tự trích xuất toàn bộ thông tin:
                tên, liên hệ, kỹ năng, kinh nghiệm, học vấn. Tiến trình được hiển thị ở góc thông báo.
              </p>

              {/* Upload zone — large & prominent */}
              <div
                onClick={() => aiFileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => { e.preventDefault(); setIsDragging(false); handleAiFiles(Array.from(e.dataTransfer.files)) }}
                style={{
                  border: `3px dashed ${isDragging ? 'var(--primary)' : aiFile ? '#10b981' : 'var(--primary-light)'}`,
                  background: isDragging ? 'var(--primary-light)' : aiFile ? '#f0fdf4' : '#fdfafb',
                  textAlign: 'center', cursor: 'pointer',
                  padding: '52px 32px', transition: '0.2s', borderRadius: 20, marginBottom: 16
                }}
              >
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', margin: '0 auto 18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: aiFile ? '#10b981' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  color: 'white',
                }}>
                  {aiFile ? <CheckCircle2 size={30} /> : <Upload size={30} />}
                </div>

                {aiFile ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#10b981', marginBottom: 8 }}>
                      ✓ File đã sẵn sàng
                    </div>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: '#d1fae5', borderRadius: 8, padding: '4px 14px',
                      fontSize: 13, color: '#065f46', fontWeight: 600
                    }}>
                      <FileText size={14} />
                      {aiFile.name}
                      <span style={{ color: '#6b7280', fontWeight: 400 }}>
                        ({(aiFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                      Click để đổi file khác
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
                      Click để chọn hoặc kéo thả file CV
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                      PDF, Word (.doc/.docx), Ảnh (JPG/PNG) — Tối đa 10MB
                    </div>
                  </>
                )}

                <input
                  ref={aiFileRef}
                  type="file"
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={e => e.target.files && handleAiFiles(Array.from(e.target.files))}
                />
              </div>

              {/* What AI will extract */}
              {aiFile && (
                <div style={{
                  padding: '14px 16px', borderRadius: 12,
                  background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)',
                  border: '1px solid #c4b5fd',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <Sparkles size={18} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 13, color: '#4c1d95' }}>
                    <strong>Task sẽ chạy ngầm:</strong> Bạn có thể đóng cửa sổ sau khi bấm Submit. AI sẽ tải file và tiến hành xử lý.
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Huỷ</button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!aiFile}
                id="submit-candidate-btn"
                style={{ padding: '12px 28px' }}
              >
                <Sparkles size={16} /> Phân tích CV ngầm
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Helper Components ────────────────────────────────────────────────────────
function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 16px', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--primary)' }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  )
}

function InputWithIcon({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
        color: 'var(--text-muted)', zIndex: 1, pointerEvents: 'none'
      }}>
        {icon}
      </span>
      <div className="input-with-icon">{children}</div>
    </div>
  )
}

function ManualUploadZone({
  uploadTasks, loading, fileInputRef, onFiles,
}: {
  uploadTasks: UploadTask[]
  loading: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFiles: (files: File[]) => void
}) {
  return (
    <div className="input-group">
      <div
        className="card"
        onClick={() => !loading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${uploadTasks.find(t => t.status === 'done') ? '#10b981' : 'var(--border)'}`,
          background: uploadTasks.find(t => t.status === 'done') ? '#f0fdf4' : 'var(--input-bg)',
          textAlign: 'center', cursor: loading ? 'not-allowed' : 'pointer', padding: 20,
          transition: '0.2s', borderRadius: 16, boxShadow: 'none'
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: '50%', margin: '0 auto 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: uploadTasks.find(t => t.status === 'done') ? '#10b981' : 'var(--primary-light)',
          color: uploadTasks.find(t => t.status === 'done') ? 'white' : 'var(--primary)'
        }}>
          {uploadTasks.find(t => t.status === 'done') ? <CheckCircle2 size={18} /> : <Upload size={18} />}
        </div>
        {uploadTasks.find(t => t.status === 'done') ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>✓ {uploadTasks.find(t => t.status === 'done')?.file.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click để đổi file</div>
          </>
        ) : uploadTasks.find(t => t.status === 'uploading') ? (
          <div style={{ fontSize: 13, fontWeight: 600 }}>Đang upload... {uploadTasks[0]?.progress}%</div>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Đính kèm file CV</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF, Word, Ảnh — max 10MB</div>
          </>
        )}
        <input ref={fileInputRef} type="file" style={{ display: 'none' }}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={e => e.target.files && onFiles(Array.from(e.target.files))} disabled={loading} />
      </div>
    </div>
  )
}
