/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export interface AppTask {
  id: string
  title: string
  subtitle: string
  progress: number
  status: 'running' | 'success' | 'error'
  error?: string
}

interface TaskContextType {
  tasks: AppTask[]
  addTask: (id: string, title: string, subtitle: string) => void
  updateTask: (id: string, updates: Partial<AppTask>) => void
  removeTask: (id: string) => void
}

const TaskContext = createContext<TaskContextType | undefined>(undefined)

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<AppTask[]>([])

  const addTask = (id: string, title: string, subtitle: string) => {
    setTasks(prev => [...prev, { id, title, subtitle, progress: 0, status: 'running' }])
  }

  const updateTask = (id: string, updates: Partial<AppTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  return (
    <TaskContext.Provider value={{ tasks, addTask, updateTask, removeTask }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTasks() {
  const context = useContext(TaskContext)
  if (!context) throw new Error('useTasks must be used within TaskProvider')
  return context
}
