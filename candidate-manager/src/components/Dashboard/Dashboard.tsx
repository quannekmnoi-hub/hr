import type { User } from '@supabase/supabase-js'

import Sidebar from '../Layout/Sidebar'
import Header from '../Layout/Header'

import CandidatesPage from './CandidatesPage'
import CandidateDetail from './CandidateDetail'
import AddCandidateModal from './AddCandidateModal'

import JobsPage from '../Jobs/JobsPage'
import PostJobModal from '../Jobs/PostJobModal'
import JobDetail from '../Jobs/JobDetail'

import {
  buildCandidateDetailPath,
  buildJobDetailPath,
  CANDIDATES_PATH,
  CANDIDATE_NEW_PATH,
  getActiveSection,
  JOBS_PATH,
  JOB_NEW_PATH,
  navigate,
  type AppRoute,
} from '../../lib/router'

interface Props {
  user: User
  route: AppRoute
}

export default function Dashboard({ user, route }: Props) {
  const activeSection = getActiveSection(route)
  const showCandidatesPage = route.kind === 'candidates' || route.kind === 'candidate-new'
  const showJobsPage = route.kind === 'jobs' || route.kind === 'job-new'

  return (
    <div className="layout">
      <Sidebar currentSection={activeSection} onNavigate={navigate} />
      
      <main className="main-content">
        <Header user={user} />
        
        <div className="page-container">
          {showCandidatesPage && (
            <CandidatesPage 
              user={user} 
              onViewDetail={(id) => navigate(buildCandidateDetailPath(id))}
              onAddCandidate={() => navigate(CANDIDATE_NEW_PATH)}
            />
          )}

          {route.kind === 'candidate-detail' && (
            <CandidateDetail 
              candidateId={route.candidateId}
              onBack={() => navigate(CANDIDATES_PATH, { replace: true })}
            />
          )}

          {showJobsPage && (
            <JobsPage 
              onPostJob={() => navigate(JOB_NEW_PATH)}
              onViewDetail={(id) => navigate(buildJobDetailPath(id))}
            />
          )}

          {route.kind === 'job-detail' && (
            <JobDetail 
              jobId={route.jobId}
              onBack={() => navigate(JOBS_PATH, { replace: true })}
              onViewCandidate={(id) => navigate(buildCandidateDetailPath(id))}
            />
          )}
        </div>
      </main>

      {route.kind === 'job-new' && (
        <PostJobModal 
          user={user} 
          onClose={() => navigate(JOBS_PATH, { replace: true })}
        />
      )}

      {route.kind === 'candidate-new' && (
        <AddCandidateModal
          userId={user.id}
          onClose={() => navigate(CANDIDATES_PATH, { replace: true })}
          onSuccess={() => {
            window.dispatchEvent(new CustomEvent('candidates-updated'))
          }}
        />
      )}
    </div>
  )
}
