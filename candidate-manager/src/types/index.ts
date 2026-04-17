export type CandidateStatus = 'New' | 'Interviewing' | 'Hired' | 'Rejected'

export interface SkillRequirement {
  name: string
  is_required?: boolean
}

export interface JobRequirements {
  required_skills?: string[]
  hard_skills?: SkillRequirement[]
  tags?: string[]
  domain?: string
  sub_domain?: string
  seniority_level?: string
  location?: string
  job_requirements?: {
    salary_range?: {
      min?: number
      max?: number
      currency?: string
    }
    min_experience_years?: number
    education_requirement?: number
    work_type?: string
    employment_type?: string
    urgency?: string
    headcount?: number
    location?: string
  }
}

export interface Candidate {
  id: string
  user_id: string
  full_name: string
  email?: string
  phone?: string
  gender?: string
  date_of_birth?: string
  location?: string
  linkedin_url?: string
  portfolio_url?: string
  applied_position: string
  status: CandidateStatus
  resume_url: string | null
  skills: string[]
  notes: string | null
  matching_score: number
  ai_analysis?: unknown
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  user_id: string
  title: string
  description: string
  requirements?: JobRequirements
  ai_summary?: string
  jd_url?: string | null
  status: 'Open' | 'Closed'
  created_at: string
  updated_at?: string
}

export interface JobRequirement {
  id: string
  position_name: string
  required_skills: string[]
  created_at: string
}

export interface AnalyticsData {
  total: number
  statusRatio: Array<{ status: string; count: number; ratio: number }>
  topPositions: Array<{ position: string; count: number }>
  recentCandidates: Candidate[]
}

export interface FilterOptions {
  search: string
  status: CandidateStatus | ''
  position: string
  dateFrom: string
  dateTo: string
  sortBy: 'created_at' | 'full_name' | 'matching_score'
  sortOrder: 'asc' | 'desc'
}

export const DEFAULT_FILTER: FilterOptions = {
  search: '',
  status: '',
  position: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'created_at',
  sortOrder: 'desc',
}

export interface UploadFileItem {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  url?: string
  error?: string
}
