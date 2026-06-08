import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOperator } from '../../lib/useOperator'
import { useStreamState } from '../../lib/useStreamState'
import { useVote } from '../../lib/useVote'
import { supabase } from '../../lib/supabase'
import type { Player, Hole } from '../../types/database'
import VoteBanner from './VoteBanner'

export default function OperatorHome() {
  const navigate = useNavigate()
  const { operator, loading: opLoading, forget } = useOperator()
  const { state, update: updateState } = useStreamState()
  const { activeVote, countdown, requestVote, objectToVote } = useVote(operator?.id)

  const [players, setPlayers] = useState<Player[]>([])
  const [holes, setHoles] = useState<Hole[]>([])
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    if (!opLoading && !operator) navigate('/operator', { replace: true })
  }, [operator, opLoading, navigate])

  useEffect(() => {
    if (!state?.round_id) return
    supabase.from('players').select('*').eq('round_id', state.round_id).order('position').then(({ data }) => {
      if (data) setPlayers(data)
    })
    supabase
      .from('rounds')
      .select('layout_id')
      .eq('id', state.round_id)
      .single()
      .then(({ data }) => {
        if (!data) return
        supabase.from('holes').select('*').eq('layout_id', data.layout_id).order('hole_number').then(({ data: hs }) => {
          if (hs) setHoles(hs)
        })
      })
  }, [state?.round_id])

  // Auto-approve vote after countdown when it's our own request
  useEffect(() => {
    if (!activeVote || countdown > 0) return
    if (activeVote.requested_by === operator?.id) {
      supabase.from('votes').update({ status: 'approved' }).eq('id', activeVote.id)
    }
  }, [activeVote, countdown, operator?.id])

  // React to approved votes
  useEffect(() => {
    if (!activeVote) return
    const channel = supabase
      .channel('vote_approval')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'votes', filter: `id=eq.${activeVote.id}` },
        async (payload) => {
          const vote = payload.new as typeof activeVote
          if (vote?.status === 'approved' && vote.type === 'take_feed') {
            await updateState({
              mode: 'live',
              active_mux_input_id: operator?.mux_stream_id ?? null,
              current_player_id: state?.current_player_id ?? null,
            })
          } else if (vote?.status === 'approved' && vote.type === 'hole_done') {
            await updateState({ mode: 'hole_media', show_leaderboard: true, shot_count: 0 })
          } else if (vote?.status === 'approved' && vote.type === 'ready_to_stream') {
            const nextHole = (state?.current_hole ?? 1)
            await updateState({
              mode: 'live',
              current_hole: nextHole,
              show_leaderboard: false,
              show_player_overlay: true,
            })
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeVote, operator, state, updateState])

  async function requestFeed() {
    setRequesting(true)
    try {
      await requestVote('take_feed', operator?.id)
    } finally {
      setRequesting(false)
    }
  }

  async function requestHoleDone() {
    setRequesting(true)
    try {
      await requestVote('hole_done')
    } finally {
      setRequesting(false)
    }
  }

  async function requestReadyToStream() {
    setRequesting(true)
    try {
      await requestVote('ready_to_stream')
    } finally {
      setRequesting(false)
    }
  }

  async function setCurrentPlayer(playerId: string) {
    await updateState({ current_player_id: playerId, shot_count: 0 })
  }

  async function incrementShot() {
    await updateState({ shot_count: (state?.shot_count ?? 0) + 1 })
  }

  async function decrementShot() {
    await updateState({ shot_count: Math.max(0, (state?.shot_count ?? 0) - 1) })
  }

  async function toggleLeaderboard() {
    await updateState({ show_leaderboard: !state?.show_leaderboard })
  }

  const currentHole = holes.find(h => h.hole_number === (state?.current_hole ?? 1))
  const iAmLive = state?.mode === 'live' && state.active_mux_input_id === operator?.mux_stream_id

  if (!state) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">No active round. Ask admin to activate a round.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 px-4 py-3 flex items-center gap-3 border-b border-gray-700">
        <span className="font-bold text-green-400">🥏 Pilot</span>
        <span className="text-sm text-gray-400 flex-1">{operator?.name}</span>
        <div className={`w-2 h-2 rounded-full ${iAmLive ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`} />
        <span className="text-xs text-gray-400">{iAmLive ? 'LIVE' : state.mode.toUpperCase()}</span>
        <button onClick={forget} className="text-xs text-gray-500 hover:text-gray-300 ml-2">Leave</button>
      </header>

      {/* Vote banner */}
      {activeVote && (
        <VoteBanner
          vote={activeVote}
          countdown={countdown}
          myOperatorId={operator?.id}
          onObject={() => objectToVote(activeVote.id)}
        />
      )}

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">

        {/* No round */}
        {!state.round_id && (
          <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-400">
            No active round. Have admin activate a round.
          </div>
        )}

        {/* Hole info */}
        {state.round_id && currentHole && (
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1">Current hole</div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-green-400">{currentHole.hole_number}</span>
              <span className="text-gray-300">Par {currentHole.par}</span>
              {currentHole.distance_meters && (
                <span className="text-gray-400 text-sm">{currentHole.distance_meters}m</span>
              )}
            </div>
          </div>
        )}

        {/* Take feed / feed controls */}
        {state.round_id && (
          <>
            {state.mode !== 'live' && (
              <button
                onClick={requestFeed}
                disabled={requesting || !!activeVote}
                className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-bold py-5 rounded-xl text-xl transition-colors"
              >
                {requesting ? 'Requesting…' : 'Take Live Feed'}
              </button>
            )}

            {iAmLive && (
              <div className="bg-red-900/30 border border-red-500 rounded-xl p-4">
                <div className="text-red-400 font-bold text-sm mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block" />
                  YOU ARE LIVE
                </div>

                {/* Player selector */}
                <div className="mb-3">
                  <div className="text-gray-400 text-xs mb-2">Filming player</div>
                  <div className="grid grid-cols-2 gap-2">
                    {players.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setCurrentPlayer(p.id)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          state.current_player_id === p.id
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shot counter */}
                {state.current_player_id && (
                  <div className="mb-3">
                    <div className="text-gray-400 text-xs mb-2">Shot count</div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={decrementShot}
                        className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-lg text-2xl font-bold"
                      >
                        −
                      </button>
                      <span className="text-4xl font-bold text-white w-12 text-center">
                        {state.shot_count}
                      </span>
                      <button
                        onClick={incrementShot}
                        className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-lg text-2xl font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Overlay toggles */}
        {state.round_id && (
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-3">Overlays</div>
            <button
              onClick={toggleLeaderboard}
              className={`w-full py-3 rounded-lg text-sm font-medium transition-colors ${
                state.show_leaderboard
                  ? 'bg-yellow-700 text-yellow-100'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {state.show_leaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
            </button>
          </div>
        )}

        {/* Hole flow buttons */}
        {state.round_id && (
          <div className="bg-gray-800 rounded-xl p-4 space-y-3">
            <div className="text-gray-400 text-xs mb-1">Hole flow</div>

            {state.mode !== 'hole_media' && (
              <button
                onClick={requestHoleDone}
                disabled={requesting || !!activeVote}
                className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:opacity-50 text-white font-semibold py-4 rounded-lg text-base transition-colors"
              >
                Hole Done
              </button>
            )}

            {state.mode === 'hole_media' && (
              <button
                onClick={requestReadyToStream}
                disabled={requesting || !!activeVote}
                className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 text-white font-semibold py-4 rounded-lg text-base transition-colors"
              >
                Ready to Stream
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
