import { Users, LogOut, Wifi } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '../../hooks/useAuth'

interface Props {
  user: User
  realtimeActive: boolean
}

export default function Header({ user, realtimeActive }: Props) {
  const { logout } = useAuth()
  const initials = user.email?.charAt(0).toUpperCase() ?? 'U'

  return (
    <header className="dashboard-header">
      <div className="header-logo">
        <div className="header-logo-icon">
          <Users size={20} color="white" />
        </div>
        <span className="header-logo-text">
          HR<span>Manager</span>
        </span>
      </div>

      <div className="header-right">
        {realtimeActive && (
          <div className="realtime-dot" title="Realtime đang kết nối">
            <Wifi size={13} />
            Realtime
          </div>
        )}

        <div className="header-user">
          <div className="header-avatar">{initials}</div>
          <div className="header-user-info">
            <span className="header-user-email">{user.email}</span>
            <span className="header-user-role">HR Manager</span>
          </div>
        </div>

        <button
          id="logout-btn"
          className="btn btn-ghost btn-sm"
          onClick={logout}
          title="Đăng xuất"
        >
          <LogOut size={15} /> Đăng xuất
        </button>
      </div>
    </header>
  )
}
