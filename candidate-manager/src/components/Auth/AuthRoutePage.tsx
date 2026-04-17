import { useState } from 'react'
import { Mail, Lock, Users, AlertCircle, CheckCircle } from 'lucide-react'

import type { AuthMode } from '../../lib/router'

interface Props {
  mode: AuthMode
  nextPath: string | null
  error: string | null
  setError: (value: string | null) => void
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string) => Promise<boolean>
  onChangeMode: (mode: AuthMode) => void
}

export default function AuthRoutePage({
  mode,
  nextPath,
  error,
  setError,
  login,
  register,
  onChangeMode,
}: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const isLogin = mode === 'login'

  const switchMode = (nextMode: AuthMode) => {
    if (nextMode === mode) return
    setError(null)
    setSuccess('')
    onChangeMode(nextMode)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess('')
    setLoading(true)

    if (isLogin) {
      await login(email, password)
    } else {
      const ok = await register(email, password)
      if (ok) {
        setSuccess('Đăng ký thành công. Kiểm tra email xác thực rồi chuyển sang tab đăng nhập.')
      }
    }

    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon" style={{ width: 64, height: 64, borderRadius: '50%' }}>
            <Users size={32} />
          </div>
        </div>
        <h1 style={{ fontSize: 28, color: 'var(--primary)', marginBottom: 8, fontWeight: 700 }}>HR Core</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Recruitment Made Joyful</p>
        {nextPath && (
          <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 13 }}>
            Đăng nhập để tiếp tục tới <strong>{nextPath}</strong>
          </p>
        )}

        <div className="auth-tabs" role="tablist">
          <button
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => switchMode('login')}
            type="button"
          >
            Login
          </button>
          <button
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => switchMode('register')}
            type="button"
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} id="auth-form" style={{ textAlign: 'left' }}>
          {error && (
            <div className="auth-error">
              <AlertCircle size={15} /> {error}
            </div>
          )}
          {success && (
            <div className="auth-success">
              <CheckCircle size={15} /> {success}
            </div>
          )}

          <div className="input-group">
            <label className="input-label" htmlFor="auth-email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }}>
                <Mail size={16} />
              </span>
              <input
                id="auth-email"
                type="email"
                className="input"
                style={{ paddingLeft: 40 }}
                placeholder="manager@hrcore.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="input-label" htmlFor="auth-password" style={{ marginBottom: 0 }}>Password</label>
              {isLogin && (
                <button
                  type="button"
                  style={{
                    fontSize: 13,
                    color: 'var(--info)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Forgot?
                </button>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }}>
                <Lock size={16} />
              </span>
              <input
                id="auth-password"
                type="password"
                className="input"
                style={{ paddingLeft: 40 }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', height: 48, fontSize: 16 }}
          >
            {loading ? (
              <><span className="spin"><Loader2 /></span> Processing...</>
            ) : isLogin ? (
              <>Sign In &rarr;</>
            ) : (
              <>Create Account &rarr;</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

function Loader2() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
  )
}
