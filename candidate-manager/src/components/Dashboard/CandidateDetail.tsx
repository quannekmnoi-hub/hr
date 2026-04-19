/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, User, ExternalLink,
  Download, FileJson, Sparkles, Star, Award, Globe, BookOpen,
  TrendingUp, Target, ChevronRight, Briefcase, Link2
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Candidate, CandidateStatus } from '../../types'

interface Props {
  candidateId: string
  onBack: () => void
}

// ─── LEVEL LABELS ──────────────────────────────────────────────
const EDUCATION_LABELS: Record<number, string> = {
  1: 'Trung học phổ thông',
  2: 'Cao đẳng / Trung cấp',
  3: 'Đại học (Cử nhân)',
  4: 'Thạc sĩ / MBA',
  5: 'Tiến sĩ',
}

const LANG_LEVEL_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Sơ cấp', color: '#94a3b8' },
  2: { label: 'Giao tiếp được', color: '#3b82f6' },
  3: { label: 'Chuyên nghiệp', color: '#8b5cf6' },
  4: { label: 'Bản ngữ / Song ngữ', color: '#10b981' },
}

const SENIORITY_COLORS: Record<string, string> = {
  Intern: '#94a3b8', Junior: '#3b82f6', Mid: '#8b5cf6',
  Senior: '#f59e0b', Lead: '#ef4444', Manager: '#ec4899',
  Director: '#dc2626', 'C-Level': '#991b1b',
}

const SKILL_CATEGORY_ICONS: Record<string, string> = {
  'Programming Language': '💻',
  'Framework & Library': '📦',
  'Database': '🗄️',
  'Cloud & DevOps': '☁️',
  'Tool & Platform': '🔧',
  'Domain Knowledge': '🧠',
  'Methodology': '📐',
  'Hardware': '⚙️',
  'Design': '🎨',
  'Other': '🔹',
}

// ─── HELPERS ───────────────────────────────────────────────────
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

function RatingBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = (value / max) * 100
  const color = value >= 8 ? '#10b981' : value >= 6 ? '#8b5cf6' : value >= 4 ? '#3b82f6' : '#94a3b8'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 7, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 20, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function ConfidenceBadge({ level }: { level: string }) {
  const colors: Record<string, string> = { High: '#10b981', Medium: '#f59e0b', Low: '#94a3b8' }
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
      background: (colors[level] || '#94a3b8') + '22',
      color: colors[level] || '#94a3b8',
    }}>
      {level}
    </span>
  )
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#8b5cf6' : score >= 40 ? '#3b82f6' : '#94a3b8'
  return (
    <div style={{
      width: 60, height: 60, borderRadius: '50%',
      border: `3px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', background: color + '12', flexShrink: 0
    }}>
      <span style={{ fontSize: 16, fontWeight: 800, color }}>{score}%</span>
    </div>
  )
}

/**
 * Tính OpenAI Confidence Score khắt khe hơn dựa trên:
 * - Điểm OpenAI gốc (confidence_score từ OpenAI)
 * - Số năm kinh nghiệm (càng ít, càng trừ điểm)
 * - Điểm hoàn thiện dữ liệu (data_quality)
 * 
 * Logic: Junior/Intern không thể có điểm cao như Senior.
 * Mỗi năm kinh nghiệm dưới 5 năm phạt 6 điểm, dưới 2 năm phạt thêm 8 điểm.
 */
function computeAdjustedConfidence(ai: any): { score: number; label: string; color: string; penalty: string | null } {
  const raw = typeof ai.confidence_score === 'number' ? Math.min(ai.confidence_score, 1) : 0.5
  const expYears: number = ai.experience_years ?? 0
  const completeness: number = ai.data_quality?.completeness_score ?? 0.5
  const clarity: number = ai.data_quality?.clarity_score ?? 0.5

  // Base từ OpenAI model (max 60 điểm)
  let base = raw * 60

  // Cộng điểm từ data quality (max 20 điểm)
  base += ((completeness + clarity) / 2) * 20

  // Cộng điểm kinh nghiệm (max 20 điểm, tuyến tính theo năm, cap ở 10 năm)
  const expBonus = Math.min(expYears / 10, 1) * 20
  base += expBonus

  // Phạt bổ sung cho kinh nghiệm thấp
  let penalty: string | null = null
  if (expYears < 1) {
    base -= 18
    penalty = 'Mới ra trường — độ tin cậy thấp'
  } else if (expYears < 2) {
    base -= 12
    penalty = 'Dưới 2 năm kinh nghiệm — trừ điểm'
  } else if (expYears < 3) {
    base -= 7
    penalty = 'Junior — tham chiếu hạn chế'
  }

  const score = Math.max(5, Math.min(100, Math.round(base)))

  const color = score >= 75 ? '#10b981' : score >= 55 ? '#f59e0b' : '#ef4444'
  const label = score >= 75 ? 'Cao' : score >= 55 ? 'Trung bình' : 'Thấp'

  return { score, label, color, penalty }
}

// ─── MAIN COMPONENT ────────────────────────────────────────────
function countKeywordHits(texts: string[], keywords: string[]): number {
  return texts.reduce((total, text) => {
    const normalized = text.toLowerCase()
    return total + (keywords.some((keyword) => normalized.includes(keyword)) ? 1 : 0)
  }, 0)
}

function buildExperienceProfile(ai: any): {
  score: number
  label: string
  color: string
  totalYears: number
  relevantYears: number
  currentRole: string | null
  stack: string[]
  highlights: string[]
  leadershipSignals: number
  impactSignals: number
} | null {
  const totalYears = typeof ai.experience_years === 'number' ? ai.experience_years : 0
  const relevantYears = typeof ai.relevant_experience_years === 'number' ? ai.relevant_experience_years : totalYears
  const workExperience = Array.isArray(ai.work_experience) ? ai.work_experience : []
  const achievements = Array.isArray(ai.achievements) ? ai.achievements : []

  if (totalYears === 0 && relevantYears === 0 && workExperience.length === 0 && achievements.length === 0) {
    return null
  }

  const currentExperience = workExperience.find((exp: any) => exp?.is_current) ?? workExperience[0] ?? null
  const responsibilityTexts: string[] = workExperience.flatMap((exp: any) =>
    Array.isArray(exp?.responsibilities) ? exp.responsibilities.filter(Boolean) : [],
  )
  const achievementTexts: string[] = achievements.flatMap((item: any) =>
    [item?.description, item?.impact].filter((text: string | undefined) => typeof text === 'string' && text.trim().length > 0),
  )
  const stack = [...new Set(
    workExperience.flatMap((exp: any) =>
      Array.isArray(exp?.skills_used) ? exp.skills_used : [],
    ).map((skill: string) => skill?.trim()).filter(Boolean),
  )].slice(0, 8) as string[]

  const leadershipSignals = countKeywordHits(
    [...responsibilityTexts, ...achievementTexts],
    ['lead', 'led', 'manage', 'managed', 'mentor', 'mentored', 'architect', 'ownership', 'owner', 'strategy'],
  )
  const impactSignals = [...responsibilityTexts, ...achievementTexts].filter((text) => /\d/.test(text)).length

  let score =
    relevantYears * 8 +
    totalYears * 4 +
    stack.length * 2 +
    leadershipSignals * 6 +
    Math.min(impactSignals, 4) * 5 +
    (ai.seniority_level ? 10 : 0)

  score = Math.max(35, Math.min(100, Math.round(score)))

  const color = score >= 85 ? '#10b981' : score >= 65 ? '#8b5cf6' : '#3b82f6'
  const label = score >= 85 ? 'Expert depth' : score >= 65 ? 'Strong track record' : 'Growing profile'
  const currentRole = currentExperience
    ? `${currentExperience.position || 'Current role'}${currentExperience.company ? ` @ ${currentExperience.company}` : ''}`
    : null

  const highlights: string[] = [...achievementTexts, ...responsibilityTexts].filter(Boolean).slice(0, 3)

  return {
    score,
    label,
    color,
    totalYears,
    relevantYears,
    currentRole,
    stack,
    highlights,
    leadershipSignals,
    impactSignals,
  }
}

export default function CandidateDetail({ candidateId, onBack }: Props) {
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [cRes, jRes] = await Promise.all([
        supabase.from('candidates').select('*').eq('id', candidateId).single(),
        supabase.from('jobs').select('*').eq('status', 'Open')
      ])
      if (cRes.data) setCandidate(cRes.data)
      if (jRes.data) setJobs(jRes.data)
      setLoading(false)
    }
    load()
  }, [candidateId])

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div className="spin" style={{ display: 'inline-flex', color: 'var(--primary)' }}><Sparkles size={32} /></div>
        <div style={{ marginTop: 16, color: 'var(--text-muted)' }}>Đang tải hồ sơ ứng viên...</div>
      </div>
    )
  }

  if (!candidate) return <div style={{ padding: 40 }}>Không tìm thấy ứng viên.</div>

  const initials = candidate.full_name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const ai = (candidate.ai_analysis || {}) as any
  void computeAdjustedConfidence
  const isV2 = !!ai.hard_skills

  const skills = isV2
    ? (ai.hard_skills || []).sort((a: any, b: any) => b.rating - a.rating)
    : (candidate.skills || []).map((s: string) => ({ name: s, rating: 5, category: 'Other', evidence: '' }))

  const experienceYears = ai.experience_years
  const experience = experienceYears != null ? `${experienceYears} năm` : 'Không rõ'
  const seniorityColor = SENIORITY_COLORS[ai.seniority_level] || 'var(--primary)'

  const experienceProfile = isV2 ? buildExperienceProfile(ai) : null

  // Job matching
  const jobMatches = jobs.map(j => {
    const req = j.requirements || {}
    const jobReqs = req.job_requirements || {}
    const reqSkills: string[] = Array.isArray(req.hard_skills)
      ? req.hard_skills.filter((s: any) => s.is_required).map((s: any) => s.name.toLowerCase())
      : Array.isArray(req.required_skills)
        ? req.required_skills.map((s: string) => s.toLowerCase())
        : []
    const candidateSkillNames = skills.map((s: any) => (typeof s === 'string' ? s : s.name).toLowerCase())
    
    let matchCount = 0
    reqSkills.forEach((r: string) => {
      if (candidateSkillNames.some((c: string) => c.includes(r) || r.includes(c))) matchCount++
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

    // Không có skill nào khớp thì coi như chưa phù hợp cho job này
    if (reqSkills.length > 0 && matchCount === 0) score = 0

    score = Math.round(score)

    return { ...j, score, reqSkills, matchCount }
  }).sort((a, b) => b.score - a.score)

  const topMatch = jobMatches.find((j) => j.score > 0) || null

  // Skill groups
  const skillGroups: Record<string, typeof skills> = {}
  skills.forEach((s: any) => {
    const cat = typeof s === 'string' ? 'Other' : (s.category || 'Other')
    if (!skillGroups[cat]) skillGroups[cat] = []
    skillGroups[cat].push(s)
  })

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ padding: '8px' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
          Ứng viên <ChevronRight size={14} />
          <span style={{ color: 'var(--text)', fontWeight: 700 }}>{candidate.full_name}</span>
          {isV2 && (
            <span style={{ fontSize: 10, background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
              OpenAI v2.0
            </span>
          )}
        </div>
      </div>

      {/* ══ HERO HEADER CARD ══════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div className="profile-avatar" style={{ width: 72, height: 72, fontSize: 24, flexShrink: 0 }}>{initials}</div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, letterSpacing: '-0.03em' }}>{candidate.full_name}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span className={`badge badge-${candidate.status.toLowerCase()}`}>{candidate.status.toUpperCase()}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)' }}>{candidate.applied_position}</span>
              {isV2 && ai.seniority_level && (
                <span style={{ fontSize: 12, fontWeight: 700, color: seniorityColor, background: seniorityColor + '18', padding: '3px 12px', borderRadius: 99 }}>
                  {ai.seniority_level}
                </span>
              )}
              {isV2 && ai.domain && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--input-bg)', padding: '3px 10px', borderRadius: 99 }}>
                  {ai.domain}
                </span>
              )}
            </div>

            {/* Tags */}
            {isV2 && ai.tags?.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ai.tags.slice(0, 8).map((t: string) => (
                  <span key={t} style={{ fontSize: 11, padding: '2px 8px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 99, fontWeight: 600 }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right: Experience Summary + Status Select */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, flexShrink: 0 }}>
            {/* Experience Summary */}
            {experienceProfile && (
              <div style={{
                padding: '10px 16px', borderRadius: 14,
                background: experienceProfile.color + '12',
                border: `1.5px solid ${experienceProfile.color}40`,
                textAlign: 'center', minWidth: 180
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 4 }}>ĐỘ TIN CẬY</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: experienceProfile.color, lineHeight: 1 }}>{experienceProfile.score}%</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: experienceProfile.color, marginTop: 4 }}>{experienceProfile.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  {experienceProfile.relevantYears} yrs relevant
                </div>
                {experienceProfile.currentRole && (
                  <div style={{ fontSize: 10, color: 'var(--text)', marginTop: 4, maxWidth: 150, lineHeight: 1.3 }}>
                    {experienceProfile.currentRole}
                  </div>
                )}
              </div>
            )}

            <select
              className="input"
              style={{ background: 'var(--primary)', color: 'white', fontWeight: 600, border: 'none', minWidth: 160 }}
              value={candidate.status}
              onChange={async e => {
                const status = e.target.value as CandidateStatus
                await supabase.from('candidates').update({ status }).eq('id', candidate.id)
                setCandidate({ ...candidate, status })
              }}
            >
              <option value="New">Status: New</option>
              <option value="Interviewing">Status: Interviewing</option>
              <option value="Hired">Status: Hired</option>
              <option value="Rejected">Status: Rejected</option>
            </select>
          </div>
        </div>

        {/* Quick stats bar */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 16, display: 'flex', gap: 28, flexWrap: 'wrap', fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
            📅 Ngày nộp: <strong style={{ color: 'var(--text)' }}>{new Date(candidate.created_at).toLocaleDateString('vi-VN')}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
            💼 Kinh nghiệm: <strong style={{ color: 'var(--text)' }}>{experience}</strong>
          </div>
          {isV2 && ai.relevant_experience_years != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
              🎯 Liên quan: <strong style={{ color: 'var(--text)' }}>{ai.relevant_experience_years} năm</strong>
            </div>
          )}
          {isV2 && ai.education_level && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
              🎓 Học vấn: <strong style={{ color: 'var(--text)' }}>{EDUCATION_LABELS[ai.education_level]}</strong>
            </div>
          )}
          {topMatch && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
              🎯 Phù hợp nhất: <strong style={{ color: 'var(--text)' }}>{topMatch.title}</strong>
              <span style={{ fontWeight: 700, color: topMatch.score >= 70 ? '#10b981' : '#f59e0b' }}>({topMatch.score}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* ══ MAIN LAYOUT: 2 cột ════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

        {/* ── CỘT TRÁI ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* OpenAI Profile Summary */}
          {isV2 && (ai.sub_domain || ai.job_function) && (
            <div className="card ai-card">
              <SectionTitle icon={<Sparkles size={18} />} title="Phân tích OpenAI" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {ai.sub_domain && (
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: '#ede9fe' }}>
                    <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 800, letterSpacing: '0.07em', marginBottom: 4 }}>CHUYÊN MÔN</div>
                    <div style={{ color: '#4c1d95', fontSize: 14, fontWeight: 600 }}>{ai.sub_domain}</div>
                  </div>
                )}
                {ai.job_function && (
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: '#e0e7ff' }}>
                    <div style={{ fontSize: 10, color: '#4338ca', fontWeight: 800, letterSpacing: '0.07em', marginBottom: 4 }}>CHỨC NĂNG</div>
                    <div style={{ color: '#312e81', fontSize: 14, fontWeight: 600 }}>{ai.job_function}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Work Experience */}
          {isV2 && Array.isArray(ai.work_experience) && ai.work_experience.length > 0 && (
            <div className="card">
              <SectionTitle icon={<Briefcase size={18} />} title="Kinh nghiệm làm việc" />
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 10, top: 4, bottom: 4, width: 2, background: 'var(--primary-light)', borderRadius: 2 }} />
                {ai.work_experience.map((exp: any, i: number) => (
                  <div key={i} style={{ paddingLeft: 32, position: 'relative', marginBottom: i < ai.work_experience.length - 1 ? 28 : 0 }}>
                    {/* Dot */}
                    <div style={{
                      position: 'absolute', left: 3, top: 4,
                      width: 16, height: 16, borderRadius: '50%',
                      background: exp.is_current ? 'var(--primary)' : 'white',
                      border: `2.5px solid var(--primary)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {exp.is_current && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />}
                    </div>

                    {/* Time badge */}
                    <div style={{
                      display: 'inline-block', fontSize: 11, fontWeight: 700,
                      color: 'var(--text-muted)', background: 'var(--input-bg)',
                      padding: '2px 10px', borderRadius: 99, marginBottom: 6
                    }}>
                      {exp.start_date}{exp.end_date ? ` — ${exp.end_date}` : ''}{exp.is_current ? ' — hiện tại' : ''}
                    </div>

                    {/* Company + Position */}
                    <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', marginBottom: 2 }}>{exp.company}</div>
                    <div style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600, marginBottom: 10 }}>{exp.position}</div>

                    {/* Responsibilities */}
                    {Array.isArray(exp.responsibilities) && exp.responsibilities.length > 0 && (
                      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {exp.responsibilities.map((r: string, ri: number) => (
                          <li key={ri} style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{r}</li>
                        ))}
                      </ul>
                    )}

                    {/* Skills used */}
                    {Array.isArray(exp.skills_used) && exp.skills_used.length > 0 && (
                      <div style={{ marginTop: 10, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {exp.skills_used.map((s: string) => (
                          <span key={s} style={{
                            fontSize: 11, padding: '2px 9px', borderRadius: 99, fontWeight: 600,
                            background: 'var(--primary-light)', color: 'var(--primary)'
                          }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hard Skills */}
          {skills.length > 0 && (
            <div className="card">
              <SectionTitle icon={<span style={{ fontSize: 18 }}>⚡</span>} title={`Kỹ năng kỹ thuật (${skills.length})`} />
              {Object.entries(skillGroups).map(([cat, sks]) => (
                <div key={cat} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 12 }}>
                    {SKILL_CATEGORY_ICONS[cat] || '🔹'} {cat.toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {(sks as any[]).map((s: any, i: number) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{typeof s === 'string' ? s : s.name}</span>
                          {isV2 && s.evidence && (
                            <span style={{
                              fontSize: 11, color: 'var(--text-muted)', maxWidth: '50%',
                              textAlign: 'right', fontStyle: 'italic',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }} title={s.evidence}>
                              {s.evidence}
                            </span>
                          )}
                        </div>
                        {isV2 && <RatingBar value={s.rating || 5} />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Achievements */}
          {isV2 && Array.isArray(ai.achievements) && ai.achievements.length > 0 && (
            <div className="card">
              <SectionTitle icon={<TrendingUp size={18} />} title="Thành tích nổi bật" />
              {ai.achievements.map((a: any, i: number) => (
                <div key={i} style={{ marginBottom: 14, padding: '12px 14px', background: 'var(--input-bg)', borderRadius: 10, borderLeft: '3px solid #f59e0b' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 5, color: 'var(--text)' }}>{a.description}</p>
                  {a.impact && <p style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>📈 {a.impact}</p>}
                  {Array.isArray(a.skills_demonstrated) && a.skills_demonstrated.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {a.skills_demonstrated.map((s: string) => (
                        <span key={s} style={{ fontSize: 10, padding: '2px 6px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 99 }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Job Matching */}
          <div className="card">
            <SectionTitle icon={<Target size={18} />} title="Phù hợp với Tin tuyển dụng" />

            {topMatch && (
              <div className="ai-card" style={{ padding: '14px 16px', borderRadius: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Target size={24} className="ai-icon" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#4c1d95', marginBottom: 2 }}>Best Match: {topMatch.title}</div>
                    <div style={{ fontSize: 13, color: '#7c3aed' }}>
                      {topMatch.score}% phù hợp · {topMatch.matchCount}/{topMatch.reqSkills.length} kỹ năng khớp
                    </div>
                  </div>
                  <ScoreCircle score={topMatch.score} />
                </div>
              </div>
            )}

            {jobMatches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                <Target size={36} style={{ opacity: 0.2, marginBottom: 10 }} />
                <div style={{ fontSize: 14 }}>Chưa có tin tuyển dụng nào. Hãy tạo job ở mục Jobs.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {jobMatches.map(j => {
                  const color = j.score >= 80 ? '#10b981' : j.score >= 60 ? '#8b5cf6' : j.score >= 40 ? '#3b82f6' : '#94a3b8'
                  const candidateSkills = skills.map((s: any) => (typeof s === 'string' ? s : s.name).toLowerCase())
                  return (
                    <div key={j.id} style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 12, borderLeft: `4px solid ${color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{j.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {j.matchCount}/{j.reqSkills.length} kỹ năng khớp
                          </div>
                        </div>
                        <ScoreCircle score={j.score} />
                      </div>
                      <div className="matching-bar-container">
                        <div className="matching-bar-fill" style={{ width: `${j.score}%`, background: color }} />
                      </div>
                      {j.reqSkills.length > 0 && (
                        <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {j.reqSkills.slice(0, 10).map((r: string) => {
                            const matched = candidateSkills.some((c: string) => c.includes(r) || r.includes(c))
                            return (
                              <span key={r} style={{
                                fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                                background: matched ? '#10b98118' : '#94a3b818',
                                color: matched ? '#10b981' : '#94a3b8'
                              }}>
                                {matched ? '✓' : '✗'} {r}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── CỘT PHẢI ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Liên hệ */}
          <div className="card">
            <SectionTitle icon={<Mail size={18} />} title="Liên hệ" />

            {(candidate.date_of_birth || ai.contact_info?.date_of_birth) && (
              <InfoRow icon={<Calendar size={16} />} label="NGÀY SINH">
                {new Date(candidate.date_of_birth || ai.contact_info?.date_of_birth).toLocaleDateString('vi-VN')}
              </InfoRow>
            )}
            {(candidate.gender || ai.contact_info?.gender) && (
              <InfoRow icon={<User size={16} />} label="GIỚI TÍNH">
                {candidate.gender || ai.contact_info?.gender}
              </InfoRow>
            )}
            {(candidate.phone || ai.contact_info?.phone) && (
              <InfoRow icon={<Phone size={16} />} label="SỐ ĐIỆN THOẠI">
                {candidate.phone || ai.contact_info?.phone}
              </InfoRow>
            )}
            <InfoRow icon={<Mail size={16} />} label="EMAIL">
              {candidate.email || ai.contact_info?.email || 'N/A'}
            </InfoRow>
            {(candidate.location || ai.contact_info?.location) && (
              <InfoRow icon={<MapPin size={16} />} label="ĐỊA ĐIỂM">
                {candidate.location || ai.contact_info?.location}
              </InfoRow>
            )}
            {(candidate.portfolio_url || ai.contact_info?.portfolio) && (
              <InfoRow icon={<Link2 size={16} />} label="PORTFOLIO">
                <a
                  href={toHref(candidate.portfolio_url || ai.contact_info?.portfolio)}
                  target="_blank" rel="noreferrer"
                  style={{ color: 'var(--primary)', fontSize: 13, wordBreak: 'break-all' }}
                >
                  {candidate.portfolio_url || ai.contact_info?.portfolio}
                </a>
              </InfoRow>
            )}
            {(candidate.linkedin_url || ai.contact_info?.linkedin) && (
              <InfoRow icon={<ExternalLink size={16} />} label="LINKEDIN">
                <a
                  href={toHref(candidate.linkedin_url || ai.contact_info?.linkedin)}
                  target="_blank" rel="noreferrer"
                  style={{ color: 'var(--primary)', fontSize: 13, wordBreak: 'break-all' }}
                >
                  {candidate.linkedin_url || ai.contact_info?.linkedin}
                </a>
              </InfoRow>
            )}
          </div>

          {experienceProfile && (
            <div className="card">
              <SectionTitle icon={<Briefcase size={18} />} title="Experience Insights" />

              <InfoRow icon={<TrendingUp size={16} />} label="DEPTH SCORE">
                <span style={{ color: experienceProfile.color, fontWeight: 800 }}>
                  {experienceProfile.score}% · {experienceProfile.label}
                </span>
              </InfoRow>

              <InfoRow icon={<Target size={16} />} label="YEARS">
                {experienceProfile.relevantYears} yrs relevant / {experienceProfile.totalYears} yrs total
              </InfoRow>

              {experienceProfile.currentRole && (
                <InfoRow icon={<Briefcase size={16} />} label="CURRENT FOCUS">
                  {experienceProfile.currentRole}
                </InfoRow>
              )}

              <InfoRow icon={<Star size={16} />} label="SIGNALS">
                {experienceProfile.leadershipSignals} leadership · {experienceProfile.impactSignals} impact
              </InfoRow>

              {experienceProfile.stack.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>
                    CORE STACK
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {experienceProfile.stack.map((skill) => (
                      <span
                        key={skill}
                        style={{
                          fontSize: 11,
                          padding: '3px 9px',
                          borderRadius: 99,
                          fontWeight: 600,
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {experienceProfile.highlights.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>
                    EVIDENCE
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {experienceProfile.highlights.map((highlight, index) => (
                      <div
                        key={`${highlight}-${index}`}
                        style={{
                          padding: '10px 12px',
                          background: 'var(--input-bg)',
                          borderRadius: 10,
                          fontSize: 13,
                          color: 'var(--text)',
                          lineHeight: 1.5,
                        }}
                      >
                        {highlight}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Soft Skills */}
          {isV2 && Array.isArray(ai.soft_skills) && ai.soft_skills.length > 0 && (
            <div className="card">
              <SectionTitle icon={<Star size={18} />} title="Kỹ năng mềm" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ai.soft_skills.map((s: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', background: 'var(--input-bg)', borderRadius: 8
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                    <ConfidenceBadge level={s.confidence} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Học vấn */}
          {isV2 && Array.isArray(ai.education_details) && ai.education_details.length > 0 && (
            <div className="card">
              <SectionTitle icon={<BookOpen size={18} />} title="Học vấn" />
              {ai.education_details.map((e: any, i: number) => (
                <div key={i} style={{
                  marginBottom: i < ai.education_details.length - 1 ? 14 : 0,
                  paddingBottom: i < ai.education_details.length - 1 ? 14 : 0,
                  borderBottom: i < ai.education_details.length - 1 ? '1px solid var(--border)' : 'none'
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{e.degree || 'Bằng cấp'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{e.institution}</div>
                  {e.field_of_study && (
                    <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4 }}>
                      {e.field_of_study} {e.graduation_year ? `· ${e.graduation_year}` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Ngôn ngữ */}
          {isV2 && Array.isArray(ai.languages) && ai.languages.length > 0 && (
            <div className="card">
              <SectionTitle icon={<Globe size={18} />} title="Ngôn ngữ" />
              {ai.languages.map((l: any, i: number) => {
                const lv = LANG_LEVEL_LABELS[l.level] || { label: 'Không rõ', color: '#94a3b8' }
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{l.name}</span>
                      {l.certification && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>· {l.certification}</span>}
                    </div>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: lv.color + '18', color: lv.color, fontWeight: 700 }}>
                      {lv.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Chứng chỉ */}
          {isV2 && Array.isArray(ai.certifications) && ai.certifications.length > 0 && (
            <div className="card">
              <SectionTitle icon={<Award size={18} />} title="Chứng chỉ" />
              {ai.certifications.map((c: any, i: number) => (
                <div key={i} style={{ marginBottom: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 9, height: 9, borderRadius: '50%',
                    background: c.relevance === 'High' ? '#10b981' : c.relevance === 'Medium' ? '#f59e0b' : '#94a3b8',
                    flexShrink: 0, marginTop: 5
                  }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.issuer} {c.year ? `· ${c.year}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CV File */}
          <div className="card" style={{ borderStyle: 'dashed', borderColor: '#cbd5e1', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: 'var(--primary)', color: 'white', padding: 8, borderRadius: 8 }}>
                <FileJson size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>CV / Hồ sơ</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{candidate.resume_url ? 'Đã upload' : 'Chưa có file'}</div>
              </div>
              {candidate.resume_url && (
                <a href={candidate.resume_url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}>
                  <Download size={14} /> Xem
                </a>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

// ─── Tiny helpers ───────────────────────────────────────────────
function toHref(url: string | undefined | null): string {
  if (!url) return '#'
  return url.startsWith('http') ? url : `https://${url}`
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

