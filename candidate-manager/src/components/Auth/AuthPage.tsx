import { useState } from 'react'
import { Mail, Lock, Users, AlertCircle, CheckCircle, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function AuthPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register, error, setError } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess('')
    setLoading(true)

    if (tab === 'login') {
      await login(email, password)
    } else {
      const ok = await register(email, password)
      if (ok) {
        setSuccess('Đăng ký thành công! Kiểm tra email để xác nhận tài khoản.')
        setTab('login')
      }
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Users size={24} />
          </div>
          <div className="auth-logo-text">
            <span className="auth-logo-name">HR Manager</span>
            <span className="auth-logo-sub">Candidate Portal</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="auth-title">
          {tab === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản'}
        </h1>
        <p className="auth-subtitle">
          {tab === 'login'
            ? 'Đăng nhập để quản lý hồ sơ ứng viên'
            : 'Đăng ký để bắt đầu sử dụng hệ thống'}
        </p>

        {/* Tabs */}
        <div className="auth-tabs" role="tablist">
          <button
            className={`auth-tab${tab === 'login' ? ' active' : ''}`}
            onClick={() => { setTab('login'); setError(null); setSuccess('') }}
            role="tab"
            id="tab-login"
          >
            Đăng nhập
          </button>
          <button
            className={`auth-tab${tab === 'register' ? ' active' : ''}`}
            onClick={() => { setTab('register'); setError(null); setSuccess('') }}
            role="tab"
            id="tab-register"
          >
            Đăng ký
          </button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit} id="auth-form">
          {error && (
            <div className="auth-error" role="alert">
              <AlertCircle size={15} /> {error}
            </div>
          )}
          {success && (
            <div className="auth-success" role="status">
              <CheckCircle size={15} /> {success}
            </div>
          )}

          <div className="input-group">
            <label className="input-label" htmlFor="auth-email">Email</label>
            <div className="input-wrap">
              <span className="input-icon"><Mail size={15} /></span>
              <input
                id="auth-email"
                type="email"
                className="input with-icon"
                placeholder="name@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="auth-password">Mật khẩu</label>
            <div className="input-wrap">
              <span className="input-icon"><Lock size={15} /></span>
              <input
                id="auth-password"
                type="password"
                className="input with-icon"
                placeholder={tab === 'register' ? 'Tối thiểu 6 ký tự' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: '8px', height: '48px', fontSize: '15px' }}
          >
            {loading
              ? <><span className="btn-spinner" /> Đang xử lý...</>
              : tab === 'login'
                ? <><LogIn size={17} /> Đăng nhập</>
                : <><UserPlus size={17} /> Tạo tài khoản</>
            }
          </button>
        </form>
      </div>
    </div>
  )
}
