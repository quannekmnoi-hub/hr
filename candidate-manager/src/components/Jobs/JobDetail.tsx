/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import {
  ArrowLeft, MapPin, ExternalLink,
  FileJson, Sparkles, Briefcase, 
  Target, ChevronRight,
  Users, DollarSign, Clock
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Props {
  jobId: string
  onBack: () => void
  onViewCandidate?: (id: string) => void
}

function formatMoney(value: number) {
  if (!value) return ''
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B'
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (value >= 1_000) return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return value.toString()
}

function FormattedJD({ text }: { text: string }) {
  if (!text) return <div>Chưa có mô tả.</div>
  
  const formatted = text
    .replace(/(THÔNG TIN TUYỂN DỤNG|Mô tả công việc|Yêu cầu ứng viên|Yêu cầu công việc|Thu nhập và Phúc lợi|Quyền lợi|Mô tả|Yêu cầu|Phúc lợi|Liên hệ|Địa điểm làm việc)/gi, '\n\n$1')
    .replace(/([^\n])(\s*[-+]\s)/g, '$1\n$2')
    .replace(/([.?!])\s+([A-ZĐ])/g, '$1\n$2') // break sentences if they are all mashed
    .replace(/(THÔNG TIN TUYỂN DỤNG|MÔ TẢ CÔNG VIỆC|YÊU CẦU ỨNG VIÊN|YÊU CẦU CÔNG VIỆC|THU NHẬP VÀ PHÚC LỢI|QUYỀN LỢI|LIÊN HỆ|ĐỊA ĐIỂM LÀM VIỆC)\s+([A-ZĂÂĐÊÔƠƯÁÀẢÃẠẮẰẲẴẶẤẦẨẪẬÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ])/gi, '$1\n\n$2')
    .trim()

  const sections = ['THÔNG TIN TUYỂN DỤNG', 'MÔ TẢ CÔNG VIỆC', 'YÊU CẦU ỨNG VIÊN', 'YÊU CẦU CÔNG VIỆC', 'THU NHẬP VÀ PHÚC LỢI', 'QUYỀN LỢI', 'MÔ TẢ', 'YÊU CẦU', 'PHÚC LỢI', 'LIÊN HỆ', 'ĐỊA ĐIỂM LÀM VIỆC']
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {formatted.split('\n').map((line, i) => {
        const cleanLine = line.trim()
        if (!cleanLine) return <div key={i} style={{ height: 8 }} />
        
        const isHeader = sections.some(s => cleanLine.toUpperCase().startsWith(s))
        const isList = cleanLine.startsWith('-') || cleanLine.startsWith('+')
        
        return (
          <div key={i} style={{ 
            fontWeight: isHeader ? 800 : 400, 
            color: isHeader ? 'var(--text)' : '#475569',
            marginTop: isHeader ? 16 : 0,
            fontSize: isHeader ? 16 : 15,
            paddingLeft: isList ? 16 : 0,
            position: 'relative'
          }}>
            {isList && <span style={{ position: 'absolute', left: 0, top: 0, color: 'var(--primary)' }}>•</span>}
            {isList ? cleanLine.substring(1).trim() : cleanLine}
          </div>
        )
      })}
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      marginBottom: 20, paddingBottom: 12,
      borderBottom: '2px solid var(--primary-light)'
    }}>
      <span style={{
        background: 'var(--primary-light)', color: 'var(--primary)',
        padding: 8, borderRadius: 10, display: 'flex', alignItems: 'center'
      }}>{icon}</span>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
        {title}
      </h2>
    </div>
  )
}

function InfoRow({ icon, label, children }: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
      <span style={{
        color: 'var(--primary)', flexShrink: 0, marginTop: 2,
        background: 'var(--primary-light)', padding: 5, borderRadius: 7, display: 'flex'
      }}>{icon}</span>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
        <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)' }}>{children}</div>
      </div>
    </div>
  )
}

export default function JobDetail({ jobId, onBack, onViewCandidate }: Props) {
  const [job, setJob] = useState<any>(null)
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [jRes, cRes] = await Promise.all([
        supabase.from('jobs').select('*').eq('id', jobId).single(),
        supabase.from('candidates').select('*')
      ])
      if (jRes.data) setJob(jRes.data)
      if (cRes.data) setCandidates(cRes.data)
      setLoading(false)
    }
    load()
  }, [jobId])

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div className="spin" style={{ display: 'inline-flex', color: 'var(--primary)' }}><Sparkles size={32} /></div>
        <div style={{ marginTop: 16, color: 'var(--text-muted)' }}>Đang tải thông tin...</div>
      </div>
    )
  }

  if (!job) return <div style={{ padding: 40 }}>Không tìm thấy Job.</div>

  const reqs = job.requirements || {}
  const jobReqs = reqs.job_requirements || {}
  
  // Format salary
  let salaryStr = 'Thỏa thuận'
  if (jobReqs.salary_range?.min || jobReqs.salary_range?.max) {
    const s = jobReqs.salary_range
    const min = s.min ? formatMoney(s.min) : ''
    const max = s.max ? formatMoney(s.max) : ''
    const curr = s.currency || 'VNĐ'
    if (min && max) salaryStr = `${min} - ${max} ${curr}`
    else if (min) salaryStr = `Từ ${min} ${curr}`
    else salaryStr = `Đến ${max} ${curr}`
  }

  // Calculate matches
  const reqSkills: string[] = Array.isArray(reqs.hard_skills)
    ? reqs.hard_skills.filter((s: any) => s.is_required).map((s: any) => s.name.toLowerCase())
    : Array.isArray(reqs.required_skills) ? reqs.required_skills.map((s: string) => s.toLowerCase()) : []

  const candidateMatches = candidates.map(c => {
    const ai = c.ai_analysis || {}
    const isV2 = !!ai.hard_skills
    const cSkills = isV2 ? (ai.hard_skills || []) : (c.skills || []).map((s: string) => ({ name: s }))
    const candidateSkillNames = cSkills.map((s: any) => (typeof s === 'string' ? s : s.name).toLowerCase())
    
    let matchCount = 0
    reqSkills.forEach((r: string) => {
      if (candidateSkillNames.some((cs: string) => cs.includes(r) || r.includes(cs))) matchCount++
    })
    
    let score = 0
    // 1. Kỹ năng (50%)
    if (reqSkills.length > 0) score += (matchCount / reqSkills.length) * 50
    else score += 50

    // 2. Kinh nghiệm (30%)
    const jExp = jobReqs.min_experience_years || 0
    const cExp = (ai.relevant_experience_years != null ? ai.relevant_experience_years : ai.experience_years) || 0
    if (jExp > 0) {
      if (cExp >= jExp) score += 30
      else score += (cExp / jExp) * 30
    } else score += 30

    // 3. Học vấn (20%)
    const jEdu = jobReqs.education_requirement || 0
    const cEdu = ai.education_level || 0
    if (jEdu > 0) {
      if (cEdu >= jEdu) score += 20
      else if (cEdu > 0) score += (cEdu / jEdu) * 20
    } else score += 20

    score = Math.round(score)
    return { ...c, matchScore: score, matchCount, ai }
  }).sort((a, b) => b.matchScore - a.matchScore).filter(c => c.status !== 'Rejected')

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ padding: '8px' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
          Tuyển dụng <ChevronRight size={14} />
          <span style={{ color: 'var(--text)', fontWeight: 700 }}>{job.title}</span>
        </div>
      </div>

      {/* HERO HEADER */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div className="profile-avatar" style={{ width: 72, height: 72, fontSize: 24, flexShrink: 0, background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Briefcase size={32} />
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, letterSpacing: '-0.03em' }}>{job.title}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span className={`badge badge-${job.status === 'Open' ? 'hired' : 'rejected'}`}>
                {job.status.toUpperCase()}
              </span>
              {reqs.domain && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--input-bg)', padding: '3px 10px', borderRadius: 99 }}>
                  {reqs.domain} {reqs.sub_domain ? `· ${reqs.sub_domain}` : ''}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, flexShrink: 0 }}>
            <select
              className="input"
              style={{ background: 'var(--primary)', color: 'white', fontWeight: 600, border: 'none', minWidth: 160 }}
              value={job.status}
              onChange={async e => {
                const status = e.target.value
                await supabase.from('jobs').update({ status }).eq('id', job.id)
                setJob({ ...job, status })
                window.dispatchEvent(new CustomEvent('jobs-updated'))
              }}
            >
              <option value="Open">Trạng thái: Open</option>
              <option value="Closed">Trạng thái: Closed</option>
            </select>
            {job.jd_url && (
               <a href={job.jd_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ width: '100%' }}>
                 <ExternalLink size={14} /> Mở file gốc
               </a>
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 16, display: 'flex', gap: 28, flexWrap: 'wrap', fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
            📅 Đăng ngày: <strong style={{ color: 'var(--text)' }}>{new Date(job.created_at).toLocaleDateString('vi-VN')}</strong>
          </div>
          {jobReqs.work_type && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
              🏢 Hình thức: <strong style={{ color: 'var(--text)' }}>{jobReqs.work_type}</strong>
            </div>
          )}
          {jobReqs.employment_type && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
              ⏳ Loại hợp đồng: <strong style={{ color: 'var(--text)' }}>{jobReqs.employment_type}</strong>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* LỚN TRÁI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* AI Info */}
          <div className="card" style={{ border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <SectionTitle icon={<Sparkles size={18} />} title="Yêu cầu từ AI" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {reqs.seniority_level && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: '#ede9fe' }}>
                  <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 800, letterSpacing: '0.07em', marginBottom: 4 }}>CẤP BẬC</div>
                  <div style={{ color: '#4c1d95', fontSize: 14, fontWeight: 600 }}>{reqs.seniority_level}</div>
                </div>
              )}
              {jobReqs.min_experience_years != null && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: '#e0e7ff' }}>
                  <div style={{ fontSize: 10, color: '#4338ca', fontWeight: 800, letterSpacing: '0.07em', marginBottom: 4 }}>KINH NGHIỆM TỐI THIỂU</div>
                  <div style={{ color: '#312e81', fontSize: 14, fontWeight: 600 }}>{jobReqs.min_experience_years} năm trở lên</div>
                </div>
              )}
            </div>
            
            {reqSkills.length > 0 && (
               <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>KỸ NĂNG BẮT BUỘC:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {reqSkills.map((s, idx) => (
                      <span key={idx} style={{ padding: '4px 10px', borderRadius: 99, background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 12, fontWeight: 600 }}>
                        {s.toUpperCase()}
                      </span>
                    ))}
                  </div>
               </div>
            )}
          </div>

          <div className="card">
             <SectionTitle icon={<FileJson size={18} />} title="Mô tả công việc" />
             <div style={{ lineHeight: 1.8, letterSpacing: '0.01em' }}>
               <FormattedJD text={job.description} />
             </div>
             
             {reqs.tags && reqs.tags.length > 0 && (
               <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px dashed var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.06em' }}>TAGS PHÂN LOẠI JD:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {reqs.tags.map((t: string, idx: number) => (
                      <span key={idx} style={{ padding: '5px 12px', borderRadius: 8, background: '#f1f5f9', color: '#475569', fontSize: 13, fontWeight: 600 }}>
                        #{t}
                      </span>
                    ))}
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* NHỎ PHẢI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <SectionTitle icon={<Briefcase size={18} />} title="Thông tin chung" />

            <InfoRow icon={<DollarSign size={16} />} label="MỨC LƯƠNG">
              <span style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>{salaryStr}</span>
            </InfoRow>
            {(jobReqs.location || reqs.location) && (
              <InfoRow icon={<MapPin size={16} />} label="ĐỊA ĐIỂM">
                {jobReqs.location || reqs.location}
              </InfoRow>
            )}
            {jobReqs.urgency && (
              <InfoRow icon={<Clock size={16} />} label="MỨC ĐỘ CẦN THIẾT">
                {jobReqs.urgency}
              </InfoRow>
            )}
            {jobReqs.headcount && (
              <InfoRow icon={<Users size={16} />} label="SỐ LƯỢNG TUYỂN">
                {jobReqs.headcount}
              </InfoRow>
            )}
          </div>
        </div>
      </div>

      {/* ỨNG VIÊN TIỀM NĂNG Ở CUỐI */}
      <div className="card">
        <SectionTitle icon={<Target size={18} />} title={`Ứng viên tiềm năng (${candidateMatches.filter(c => c.matchScore >= 40).length})`} />
        
        {candidateMatches.filter(c => c.matchScore >= 40).length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <Users size={32} style={{ opacity: 0.2, margin: '0 auto 10px' }} />
            <div style={{ fontSize: 14 }}>Chưa có ứng viên nào đạt độ phù hợp (≥40%) với vị trí này.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {candidateMatches.filter(c => c.matchScore >= 40).slice(0, 12).map((c) => {
              const color = c.matchScore >= 80 ? '#10b981' : c.matchScore >= 60 ? '#8b5cf6' : '#3b82f6'
              return (
                <div key={c.id} 
                     className="hoverable"
                     onClick={() => onViewCandidate?.(c.id)}
                     style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', borderLeft: `4px solid ${color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="avatar" style={{ background: 'var(--primary-light)', color: 'var(--primary)', width: 44, height: 44, fontSize: 15, fontWeight: 800 }}>
                        {c.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{c.full_name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, marginBottom: 4 }}>
                          {c.applied_position}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Kinh nghiệm: <strong style={{ color: 'var(--text)' }}>{c.ai?.experience_years ?? 0} năm</strong> · Học vấn: Mức <strong style={{ color: 'var(--text)' }}>{c.ai?.education_level ?? '?'}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--input-bg)', padding: '10px 14px', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Khớp <strong style={{ color: 'var(--text)' }}>{c.matchCount}/{reqSkills.length}</strong> kỹ năng cốt lõi
                    </div>
                    <div style={{ fontWeight: 900, color, fontSize: 18 }}>{c.matchScore}%</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
