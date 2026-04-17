import { useSyncExternalStore } from 'react'

export type AuthMode = 'login' | 'register'
export type AppSection = 'candidates' | 'jobs'

export type AppRoute =
  | { kind: 'root' }
  | { kind: 'login'; next: string | null }
  | { kind: 'register'; next: string | null }
  | { kind: 'candidates' }
  | { kind: 'candidate-new' }
  | { kind: 'candidate-detail'; candidateId: string }
  | { kind: 'jobs' }
  | { kind: 'job-new' }
  | { kind: 'job-detail'; jobId: string }
  | { kind: 'unknown'; pathname: string }

export interface LocationSnapshot {
  pathname: string
  search: string
  hash: string
}

const ROUTE_EVENT = 'hr:route-change'
const FALLBACK_SNAPSHOT: LocationSnapshot = { pathname: '/', search: '', hash: '' }
let cachedSnapshot = FALLBACK_SNAPSHOT

export const DEFAULT_PROTECTED_PATH = '/candidates'
export const CANDIDATES_PATH = '/candidates'
export const CANDIDATE_NEW_PATH = '/candidates/new'
export const JOBS_PATH = '/jobs'
export const JOB_NEW_PATH = '/jobs/new'

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') return '/'
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed || '/'
}

function getWindowLocation(): LocationSnapshot {
  if (typeof window === 'undefined') return FALLBACK_SNAPSHOT

  const nextSnapshot = {
    pathname: normalizePathname(window.location.pathname),
    search: window.location.search,
    hash: window.location.hash,
  }

  if (
    cachedSnapshot.pathname === nextSnapshot.pathname &&
    cachedSnapshot.search === nextSnapshot.search &&
    cachedSnapshot.hash === nextSnapshot.hash
  ) {
    return cachedSnapshot
  }

  cachedSnapshot = nextSnapshot
  return cachedSnapshot
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleChange = () => onStoreChange()
  window.addEventListener('popstate', handleChange)
  window.addEventListener(ROUTE_EVENT, handleChange)

  return () => {
    window.removeEventListener('popstate', handleChange)
    window.removeEventListener(ROUTE_EVENT, handleChange)
  }
}

export function useLocationSnapshot() {
  return useSyncExternalStore(subscribe, getWindowLocation, () => FALLBACK_SNAPSHOT)
}

export function navigate(path: string, options?: { replace?: boolean }) {
  if (typeof window === 'undefined') return

  const url = new URL(path, window.location.origin)
  const target = `${normalizePathname(url.pathname)}${url.search}${url.hash}`
  const current = `${normalizePathname(window.location.pathname)}${window.location.search}${window.location.hash}`

  if (target === current) return

  if (options?.replace) {
    window.history.replaceState({}, '', target)
  } else {
    window.history.pushState({}, '', target)
  }

  window.dispatchEvent(new Event(ROUTE_EVENT))
  window.scrollTo({ top: 0 })
}

export function buildAuthPath(mode: AuthMode, next?: string | null) {
  const path = mode === 'register' ? '/auth/register' : '/auth/login'
  const safeNext = sanitizeRedirectPath(next)

  if (!safeNext) return path

  const searchParams = new URLSearchParams({ next: safeNext })
  return `${path}?${searchParams.toString()}`
}

export function buildCandidateDetailPath(candidateId: string) {
  return `${CANDIDATES_PATH}/${encodeURIComponent(candidateId)}`
}

export function buildJobDetailPath(jobId: string) {
  return `${JOBS_PATH}/${encodeURIComponent(jobId)}`
}

export function isAuthRoute(route: AppRoute): route is Extract<AppRoute, { kind: 'login' | 'register' }> {
  return route.kind === 'login' || route.kind === 'register'
}

export function getActiveSection(route: AppRoute): AppSection | null {
  switch (route.kind) {
    case 'candidates':
    case 'candidate-new':
    case 'candidate-detail':
      return 'candidates'
    case 'jobs':
    case 'job-new':
    case 'job-detail':
      return 'jobs'
    default:
      return null
  }
}

export function sanitizeRedirectPath(candidate: string | null | undefined): string | null {
  if (!candidate) return null

  try {
    const base = typeof window === 'undefined' ? 'https://local.app' : window.location.origin
    const url = new URL(candidate, base)

    if (!url.pathname.startsWith('/')) return null

    const pathname = normalizePathname(url.pathname)
    if (pathname.startsWith('/auth')) return null

    return `${pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

export function getCurrentPath(snapshot: LocationSnapshot) {
  return `${snapshot.pathname}${snapshot.search}${snapshot.hash}`
}

export function parseAppRoute(pathname: string, search = ''): AppRoute {
  const normalizedPath = normalizePathname(pathname)
  const params = new URLSearchParams(search)
  const next = params.get('next')

  if (normalizedPath === '/') return { kind: 'root' }
  if (normalizedPath === '/auth/login' || normalizedPath === '/login') return { kind: 'login', next }
  if (normalizedPath === '/auth/register' || normalizedPath === '/register') return { kind: 'register', next }

  if (normalizedPath === CANDIDATES_PATH) return { kind: 'candidates' }
  if (normalizedPath === CANDIDATE_NEW_PATH) return { kind: 'candidate-new' }

  const candidateMatch = normalizedPath.match(/^\/candidates\/([^/]+)$/)
  if (candidateMatch) {
    return { kind: 'candidate-detail', candidateId: decodeURIComponent(candidateMatch[1]) }
  }

  if (normalizedPath === JOBS_PATH) return { kind: 'jobs' }
  if (normalizedPath === JOB_NEW_PATH) return { kind: 'job-new' }

  const jobMatch = normalizedPath.match(/^\/jobs\/([^/]+)$/)
  if (jobMatch) {
    return { kind: 'job-detail', jobId: decodeURIComponent(jobMatch[1]) }
  }

  return { kind: 'unknown', pathname: normalizedPath }
}
