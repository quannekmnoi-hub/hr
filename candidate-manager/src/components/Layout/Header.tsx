import { useState } from 'react'
import { Search, Bell, LogOut, CheckCircle2, Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useTasks } from '../../contexts/TaskContext'

interface Props {
  user: User
}

export default function Header({ user }: Props) {
  const { tasks } = useTasks()
  const [showLogout, setShowLogout] = useState(false)
  
  const initials = user.email?.charAt(0).toUpperCase() ?? 'U'
  
  const activeTasks = tasks.filter(t => t.status === 'running')
  const errorTasks = tasks.filter(t => t.status === 'error')
  const completedTasks = tasks.filter(t => t.status === 'success')

  return (
    <header className="header">
      <div className="header-search">
        <Search size={16} color="var(--text-muted)" />
        <input type="text" placeholder="Search dashboard..." />
      </div>

      <div className="header-actions">
        {/* Background Tasks Indicator */}
        {tasks.length > 0 && (
          <div className="tasks-indicator" style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 16 }}>
            {activeTasks.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'var(--primary-light)', borderRadius: 20 }}>
                <Loader2 size={14} className="spin" style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
                  Processing {activeTasks.length} task{activeTasks.length > 1 ? 's' : ''}...
                </span>
              </div>
            ) : errorTasks.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: '#fee2e2', borderRadius: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>
                  ❌ {errorTasks[errorTasks.length - 1].error || 'Task failed!'}
                </span>
              </div>
            ) : completedTasks.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: '#d1fae5', borderRadius: 20 }}>
                <CheckCircle2 size={14} style={{ color: '#059669' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>
                  All tasks complete
                </span>
              </div>
            ) : null}
          </div>
        )}

        <button className="header-icon-btn">
          <Bell size={20} />
        </button>
        
        {/* User Profile & Logout */}
        <div style={{ position: 'relative' }}>
          <div 
            className="user-profile" 
            onClick={() => setShowLogout(!showLogout)} 
            style={{ cursor: 'pointer' }}
          >
            <div className="avatar">{initials}</div>
          </div>

          {showLogout && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: 'white', border: '1px solid var(--border)', borderRadius: 8,
              padding: 8, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              minWidth: 150
            }}>
              <div style={{ padding: '4px 8px', fontSize: 13, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', marginBottom: 4, paddingBottom: 8 }}>
                {user.email}
              </div>
              <button 
                className="btn btn-ghost" 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, color: 'var(--error)' }} 
                onClick={() => supabase.auth.signOut()}
              >
                <LogOut size={16} /> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
