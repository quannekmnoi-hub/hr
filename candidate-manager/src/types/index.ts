export type CandidateStatus = 'New' | 'Interviewing' | 'Hired' | 'Rejected'

export interface Candidate {
  id: string
  user_id: string
  full_name: string
  applied_position: string
  status: CandidateStatus
  resume_url: string | null
  skills: string[]
  notes: string | null
  matching_score: number
  created_at: string
  updated_at: string
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
  recentCount: number
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
