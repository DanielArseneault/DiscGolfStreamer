import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import type { Vote, VoteObjection, VoteType } from '../types/database'

const VOTE_TIMEOUT_MS = 5000

export function useVote(operatorId: string | undefined) {
  const [activeVote, setActiveVote] = useState<Vote | null>(null)
  const [objections, setObjections] = useState<VoteObjection[]>([])
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    const votesChannel = supabase
      .channel('votes_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' },
        (payload) => {
          const vote = payload.new as Vote
          if (vote.status === 'pending') {
            setActiveVote(vote)
            const ms = new Date(vote.expires_at).getTime() - Date.now()
            setCountdown(Math.max(0, Math.ceil(ms / 1000)))
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'votes' },
        (payload) => {
          const vote = payload.new as Vote
          if (vote.status !== 'pending') setActiveVote(null)
          else setActiveVote(vote)
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vote_objections' },
        (payload) => setObjections(prev => [...prev, payload.new as VoteObjection]))
      .subscribe()

    return () => { supabase.removeChannel(votesChannel) }
  }, [])

  // Countdown ticker
  useEffect(() => {
    if (!activeVote) return
    const interval = setInterval(() => {
      const ms = new Date(activeVote.expires_at).getTime() - Date.now()
      setCountdown(Math.max(0, Math.ceil(ms / 1000)))
    }, 500)
    return () => clearInterval(interval)
  }, [activeVote])

  const requestVote = useCallback(async (type: VoteType, targetOperatorId?: string) => {
    if (!operatorId) throw new Error('No operator session')
    const expiresAt = new Date(Date.now() + VOTE_TIMEOUT_MS).toISOString()
    const { data, error } = await supabase
      .from('votes')
      .insert({
        type,
        requested_by: operatorId,
        target_operator_id: targetOperatorId ?? null,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }, [operatorId])

  const objectToVote = useCallback(async (voteId: string) => {
    if (!operatorId) return
    await supabase.from('vote_objections').insert({ vote_id: voteId, operator_id: operatorId })
    await supabase.from('votes').update({ status: 'rejected' }).eq('id', voteId)
    setActiveVote(null)
  }, [operatorId])

  const approveVote = useCallback(async (voteId: string) => {
    await supabase.from('votes').update({ status: 'approved' }).eq('id', voteId)
    setActiveVote(null)
  }, [])

  return { activeVote, objections, countdown, requestVote, objectToVote, approveVote }
}
