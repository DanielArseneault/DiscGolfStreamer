import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import type { StreamState } from '../types/database'

export function useStreamState() {
  const [state, setState] = useState<StreamState | null>(null)

  useEffect(() => {
    supabase
      .from('stream_state')
      .select('*')
      .eq('id', 'singleton')
      .single()
      .then(({ data }) => { if (data) setState(data) })

    const channel = supabase
      .channel('stream_state')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'stream_state', filter: 'id=eq.singleton' },
        (payload) => setState(payload.new as StreamState)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function update(patch: Partial<StreamState>) {
    const { data, error } = await supabase
      .from('stream_state')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', 'singleton')
      .select()
      .single()
    if (error) throw error
    setState(data)
    return data
  }

  return { state, update }
}
