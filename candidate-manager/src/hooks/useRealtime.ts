import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtime(userId: string, onUpdate: () => void) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`candidates:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidates',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          onUpdate()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [userId, onUpdate])
}
