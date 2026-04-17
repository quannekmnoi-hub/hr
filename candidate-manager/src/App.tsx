import { useEffect } from 'react'

import AuthRoutePage from './components/Auth/AuthRoutePage'
import Dashboard from './components/Dashboard/Dashboard'
import NotFoundPage from './components/Layout/NotFoundPage'
import { TaskProvider } from './contexts/TaskContext'
import { useAuth } from './hooks/useAuth'
import {
  buildAuthPath,
  DEFAULT_PROTECTED_PATH,
  getCurrentPath,
  isAuthRoute,
  navigate,
  parseAppRoute,
  sanitizeRedirectPath,
  useLocationSnapshot,
} from './lib/router'

function App() {
  const { user, loading, error, setError, login, register } = useAuth()
  const location = useLocationSnapshot()
  const route = parseAppRoute(location.pathname, location.search)
  const safeNext = isAuthRoute(route) ? sanitizeRedirectPath(route.next) : null
  const currentPath = getCurrentPath(location)
  const isUnknownRoute = route.kind === 'unknown'
  const shouldRedirectToLogin = !user && !isAuthRoute(route) && !isUnknownRoute

  useEffect(() => {
    if (loading) return

    if (route.kind === 'root') {
      navigate(user ? DEFAULT_PROTECTED_PATH : buildAuthPath('login'), { replace: true })
      return
    }

    if (!user) {
      if (shouldRedirectToLogin) {
        navigate(buildAuthPath('login', currentPath), { replace: true })
      }
      return
    }

    if (isAuthRoute(route)) {
      navigate(safeNext ?? DEFAULT_PROTECTED_PATH, { replace: true })
      return
    }

  }, [currentPath, loading, route, safeNext, shouldRedirectToLogin, user])

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
      </div>
    )
  }

  const needsRedirect =
    route.kind === 'root' ||
    shouldRedirectToLogin ||
    (!!user && isAuthRoute(route))

  if (needsRedirect) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
      </div>
    )
  }

  if (isUnknownRoute) {
    return (
      <NotFoundPage
        pathname={route.pathname}
        actionLabel={user ? 'Back to Home' : 'Go to Login'}
        onAction={() => navigate(user ? DEFAULT_PROTECTED_PATH : buildAuthPath('login'))}
      />
    )
  }

  if (!user || isAuthRoute(route)) {
    return (
      <AuthRoutePage
        mode={route.kind === 'register' ? 'register' : 'login'}
        nextPath={safeNext}
        error={error}
        setError={setError}
        login={login}
        register={register}
        onChangeMode={(mode) => navigate(buildAuthPath(mode, safeNext), { replace: true })}
      />
    )
  }

  return (
    <TaskProvider>
      <Dashboard user={user} route={route} />
    </TaskProvider>
  )
}

export default App
