import { useState, useRef, useCallback } from 'react'
import {
  X, AlertCircle, Sparkles, Briefcase, Brain,
  Upload, CheckCircle2, FileText
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { analyzeJD, extractTextFromFile } from '../../lib/ai'
import type { User } from '@supabase/supabase-js'
import { useTasks } from '../../contexts/TaskContext'
import { uploadFilesWithConcurrency, type UploadTask } from '../../hooks/useCandidates'

interface Props {
  user: User
  onClose: () => void
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return typeof error === 'string' ? error : JSON.stringify(error)
}

export default function PostJobModal({ user, onClose }: Props) {
  const { addTask, updateTask } = useTasks()
  const [title, setTitle] = useState('')
  const [jdFile, setJdFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── File handling ─────────────────────────────────────────────────────────
  const handleFiles = useCallback((files: File[]) => {
    if (files.length === 0) return
    setError(null)
    setJdFile(files[0])
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    handleFiles(Array.from(e.dataTransfer.files))
  }

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null)

    if (!title.trim()) {
      setError('Vui lòng nhập tên vị trí tuyển dụng'); return
    }
    if (!jdFile) {
      setError('Vui lòng upload file Job Description để AI phân tích'); return
    }

    // Đóng form ngay lập tức & đưa vào background task
    onClose()

    const taskId = crypto.randomUUID()
    addTask(taskId, `Đăng tin: ${title}`, jdFile.name)

    try {
      // 1. Upload JD file lên storage (bucket resumes hoặc jobs tùy hệ thống)
      // Dùng chung uploadFilesWithConcurrency để tải file lên
      updateTask(taskId, { progress: 10, subtitle: 'Đang upload file JD...' })
      const uploadResult = await new Promise<UploadTask[]>((resolve) => {
        uploadFilesWithConcurrency([jdFile], user.id, 1, tasks => {
          if (tasks.length > 0) {
            updateTask(taskId, { progress: 10 + (tasks[0].progress * 0.1) })
          }
          if (tasks[0]?.status === 'done' || tasks[0]?.status === 'error') {
            resolve(tasks)
          }
        })
      })
      const jd_url = uploadResult.find(t => t.status === 'done')?.url ?? null

      // 2. Extract text from file
      updateTask(taskId, { progress: 25, subtitle: 'Đang đọc nội dung file...' })
      const extracted = await extractTextFromFile(jdFile)
      const fileText = extracted.text || ''
      const fileImage = extracted.image

      if ((!fileText || fileText.trim().length < 20) && !fileImage) {
        throw new Error('Không thể đọc nội dung file. Vui lòng thử file khác có chứa văn bản hoạch hình ảnh.')
      }

      // 3. Analyze text/image with AI
      updateTask(taskId, { progress: 40, subtitle: 'AI đang phân tích Job Description...' })
      const requirements = await analyzeJD({
        title: title.trim(),
        description: fileText,
        jdImage: fileImage
      })

      if (!requirements) {
        throw new Error('AI không trả về dữ liệu. Kiểm tra AI server tại port 8045.')
      }

      // 4. Lưu database
      updateTask(taskId, { progress: 80, subtitle: 'Đang lưu vào hệ thống...' })
      const required_skills = Array.isArray(requirements.hard_skills)
        ? requirements.hard_skills
          .filter((s: { is_required?: boolean }) => s.is_required)
          .map((s: { name: string }) => s.name)
        : []

      const payload = {
        user_id: user.id,
        title: title.trim(),
        description: fileText ? fileText.slice(0, 5000) : '[Mô tả văn bản được trích xuất từ định dạng hình ảnh/file]', // lưu 5000 ký tự đầu
        requirements: {
          ...requirements,
          required_skills,
        },
        ai_summary: requirements.sub_domain
          ? `${requirements.domain} — ${requirements.sub_domain}`
          : requirements.domain || 'Analyzed by AI Engine v2.0',
        jd_url,
        status: 'Open',
      }
      console.log('Job Insert Payload:', payload)

      const { error: insertError } = await supabase
        .from('jobs')
        .insert(payload)

      if (insertError) throw insertError

      updateTask(taskId, { progress: 100, status: 'success' })
      window.dispatchEvent(new CustomEvent('jobs-updated'))

      // Xoá thông báo success sau 3s (tuỳ chọn, tạm thời giữ để user thấy checkmark)
      setTimeout(() => updateTask(taskId, { status: 'success' }), 5000)
    } catch (err: unknown) {
      console.error('Job Insert Error:', err)
      const errorMsg = getErrorMessage(err)
      updateTask(taskId, { status: 'error', error: errorMsg })
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
              <h2 className="modal-title">Đăng tin tuyển dụng</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                AI Engine v2.0 sẽ tự động phân tích yêu cầu từ file JD
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="auth-error" style={{ marginBottom: 16 }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            {/* Job Title */}
            <div className="input-group">
              <label className="input-label" htmlFor="job-title">
                Tên vị trí tuyển dụng <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 14, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-muted)'
                }}>
                  <Briefcase size={16} />
                </span>
                <input
                  id="job-title"
                  type="text"
                  className="input"
                  style={{ paddingLeft: 40 }}
                  placeholder="VD: Senior Backend Developer"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* JD File Upload */}
            <div className="input-group" style={{ marginTop: 20 }}>
              <label className="input-label">
                File Job Description <span style={{ color: 'var(--error)' }}>*</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                  — Bất kỳ định dạng nào (PDF, DOC/DOCX, TXT, Hình ảnh, v.v.)
                </span>
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                style={{
                  border: `3px dashed ${isDragging ? 'var(--primary)' : jdFile ? 'var(--success, #10b981)' : 'var(--primary-light)'}`,
                  background: isDragging ? 'var(--primary-light)' : jdFile ? '#f0fdf4' : '#fdfafb',
                  borderRadius: 20,
                  padding: '40px 32px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: '0.2s',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  margin: '0 auto 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: jdFile ? '#10b981' : 'var(--primary)',
                  color: 'white',
                }}>
                  {jdFile ? <CheckCircle2 size={26} /> : <Upload size={26} />}
                </div>

                {jdFile ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#10b981', marginBottom: 6 }}>
                      ✓ Đã chọn file
                    </div>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: '#d1fae5', borderRadius: 8, padding: '4px 12px',
                      fontSize: 13, color: '#065f46', fontWeight: 600
                    }}>
                      <FileText size={14} />
                      {jdFile.name}
                      <span style={{ color: '#6b7280', fontWeight: 400 }}>
                        ({(jdFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                      Click để đổi file khác
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                      Click để upload hoặc kéo thả file JD
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      Không bắt buộc định dạng — Có thể tuỳ chọn (Tối đa 10MB)
                    </div>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files && handleFiles(Array.from(e.target.files))}
                />
              </div>
            </div>

            {/* AI Info Banner */}
            {jdFile && (
              <div style={{
                marginTop: 16, padding: '12px 16px', borderRadius: 12,
                background: 'var(--primary-light)', border: '1px solid var(--primary)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <Sparkles size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: 'var(--primary)' }}>
                  <strong>Task sẽ chạy ngầm:</strong> Bạn có thể đóng cửa sổ sau khi bấm Submit, AI sẽ tiếp tục xử lý và lưu kết quả.
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Huỷ
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!title.trim() || !jdFile}
              style={{ padding: '10px 24px' }}
            >
              <Sparkles size={16} /> Phân tích & Đăng tin ngầm
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
