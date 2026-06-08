import { useState, useEffect, useRef } from 'react'
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

  // Refs so the auto-approve effect always sees the latest values
  const stateRef = useRef(state)
  const operatorRef = useRef(operator)
  const updateStateRef = useRef(updateState)
  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { operatorRef.current = operator }, [operator])
  useEffect(() => { updateStateRef.current = updateState }, [updateState])

  useEffect(() => {
    if (!opLoading && !operator) navigate('/operator', { replace: true })
  }, [operator, opLoading, navigate])

  useEffect(() => {
    if (!state?.round_id) return
    supabase.from('players').select('*').eq('round_id', state.round_id).order('position').then(({ data }) => {
      if (data) setPlayers(data)
    })
    supabase
      .from('rounds').select('layout_id').eq('id', state.round_id).single()
      .then(({ data }) => {
        if (!data) return
        supabase.from('holes').select('*').eq('layout_id', data.layout_id).order('hole_number').then(({ data: hs }) => {
          if (hs) setHoles(hs)
        })
      })
  }, [state?.round_id])

  // Auto-approve: requesting operator re-checks DB then acts directly —
  // avoids relying on realtime UPDATE delivery for triggering actions.
  useEffect(() => {
    if (!activeVote || countdown > 0) return
    if (activeVote.requested_by !== operator?.id) return

    const vote = activeVote
    ;(async () => {
      // Re-check: abort if someone objected right at the deadline
      const { data } = await supabase.from('votes').select('status').eq('id', vote.id).single()
      if (data?.status !== 'pending') return

      await supabase.from('votes').update({ status: 'approved' }).eq('id', vote.id)

      const s = stateRef.current
      const op = operatorRef.current
      const doUpdate = updateStateRef.current

      if (vote.type === 'take_feed') {
        await doUpdate({
          mode: 'live',
          active_mux_input_id: op?.mux_stream_id ?? null,
          current_player_id: s?.current_player_id ?? null,
        })
      } else if (vote.type === 'hole_done') {
        if (s?.current_player_id && (s.shot_count ?? 0) > 0) {
          await supabase.from('scores').upsert(
            { player_id: s.current_player_id, hole_number: s.current_hole ?? 1, strokes: s.shot_count ?? 0 },
            { onConflict: 'player_id,hole_number' }
          )
        }
        await doUpdate({ mode: 'hole_media', show_leaderboard: true, shot_count: 0 })
      } else if (vote.type === 'ready_to_stream') {
        await doUpdate({
          mode: 'live',
          current_hole: (s?.current_hole ?? 1) + 1,
          show_leaderboard: false,
          show_player_overlay: true,
          shot_count: 1,
        })
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, activeVote?.id, operator?.id])

  async function requestFeed() {
    setRequesting(true)
    try { await requestVote('take_feed', operator?.id) } finally { setRequesting(false) }
  }
  async function requestHoleDone() {
    setRequesting(true)
    try { await requestVote('hole_done') } finally { setRequesting(false) }
  }
  async function requestReadyToStream() {
    setRequesting(true)
    try { await requestVote('ready_to_stream') } finally { setRequesting(false) }
  }
  async function saveScore(playerId: string, holeNumber: number, strokes: number) {
    await supabase
      .from('scores')
      .upsert({ player_id: playerId, hole_number: holeNumber, strokes },
               { onConflict: 'player_id,hole_number' })
  }

  async function setCurrentPlayer(newPlayerId: string) {
    // Save the outgoing player's shot count as their score
    if (state?.current_player_id && state.current_player_id !== newPlayerId && (state.shot_count ?? 0) > 0) {
      await saveScore(state.current_player_id, state.current_hole ?? 1, state.shot_count ?? 0)
    }
    // Load this player's existing score for the current hole (if any)
    const { data } = await supabase
      .from('scores')
      .select('strokes')
      .eq('player_id', newPlayerId)
      .eq('hole_number', state?.current_hole ?? 1)
      .maybeSingle()
    await updateState({ current_player_id: newPlayerId, shot_count: data?.strokes ?? 1 })
  }
  async function incrementShot() {
    await updateState({ shot_count: (state?.shot_count ?? 0) + 1 })
  }
  async function decrementShot() {
    await updateState({ shot_count: Math.max(1, (state?.shot_count ?? 1) - 1) })
  }
  async function toggleLeaderboard() {
    await updateState({ show_leaderboard: !state?.show_leaderboard })
  }

  const currentHole = holes.find(h => h.hole_number === (state?.current_hole ?? 1))
  const nextHole = holes.find(h => h.hole_number === (state?.current_hole ?? 1) + 1)
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
      <header className="bg-gray-800 px-4 py-3 flex items-center gap-3 border-b border-gray-700">
        <span className="font-bold text-green-400">🥏 Pilot</span>
        <span className="text-sm text-gray-400 flex-1">{operator?.name}</span>
        <div className={`w-2 h-2 rounded-full ${iAmLive ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`} />
        <span className="text-xs text-gray-400">{iAmLive ? 'LIVE' : state.mode.toUpperCase()}</span>
        <button onClick={forget} className="text-xs text-gray-500 hover:text-gray-300 ml-2">Leave</button>
      </header>

      {activeVote && (
        <VoteBanner
          vote={activeVote}
          countdown={countdown}
          myOperatorId={operator?.id}
          onObject={() => objectToVote(activeVote.id)}
        />
      )}

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-8">

        {!state.round_id && (
          <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-400">
            No active round. Have admin activate a round.
          </div>
        )}

        {/* Hole info */}
        {state.round_id && (
          <div className="bg-gray-800 rounded-xl p-4">
            {state.mode === 'hole_media' ? (
              <>
                <div className="text-yellow-400 text-xs font-semibold mb-1 uppercase tracking-wide">Between holes</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-gray-300">
                    Hole {state.current_hole} done
                  </span>
                  {nextHole && (
                    <span className="text-gray-400 text-sm">
                      → Next: Hole {nextHole.hole_number}, Par {nextHole.par}
                      {nextHole.distance_meters ? `, ${nextHole.distance_meters}m` : ''}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-gray-400 text-xs mb-1">Current hole</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-green-400">{state.current_hole}</span>
                  {currentHole && (
                    <>
                      <span className="text-gray-300">Par {currentHole.par}</span>
                      {currentHole.distance_meters && (
                        <span className="text-gray-400 text-sm">{currentHole.distance_meters}m</span>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Take feed */}
        {state.round_id && state.mode !== 'live' && state.mode !== 'hole_media' && (
          <button
            onClick={requestFeed}
            disabled={requesting || !!activeVote}
            className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-bold py-5 rounded-xl text-xl transition-colors"
          >
            {requesting ? 'Requesting…' : 'Take Live Feed'}
          </button>
        )}

        {/* Live controls */}
        {iAmLive && (
          <div className="bg-red-900/30 border border-red-500 rounded-xl p-4">
            <div className="text-red-400 font-bold text-sm mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block" />
              YOU ARE LIVE
            </div>

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

            {state.current_player_id && (
              <div>
                <div className="text-gray-400 text-xs mb-2">Shot count</div>
                <div className="flex items-center gap-4">
                  <button onClick={decrementShot} className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-lg text-2xl font-bold">−</button>
                  <span className="text-4xl font-bold text-white w-12 text-center">{state.shot_count}</span>
                  <button onClick={incrementShot} className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-lg text-2xl font-bold">+</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Overlay toggles */}
        {state.round_id && state.mode === 'live' && (
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

        {/* Between-hole: player pre-selection */}
        {state.round_id && state.mode === 'hole_media' && players.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-2">Who will you film next?</div>
            <div className="grid grid-cols-2 gap-2">
              {players.map(p => (
                <button
                  key={p.id}
                  onClick={() => setCurrentPlayer(p.id)}
                  className={`py-3 px-3 rounded-lg text-sm font-medium transition-colors ${
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
        )}

        {/* Hole flow */}
        {state.round_id && (
          <div className="bg-gray-800 rounded-xl p-4 space-y-3">
            <div className="text-gray-400 text-xs">Hole flow</div>

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
                Ready to Stream →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
