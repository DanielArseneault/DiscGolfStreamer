import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Round, Player, Score, Hole, Layout, Course } from '../../types/database'

type PlayerWithScores = Player & { scores: Score[] }

export default function RoundDetailPage() {
  const { roundId } = useParams<{ roundId: string }>()
  const [round, setRound] = useState<Round & { layouts: Layout & { courses: Course } } | null>(null)
  const [players, setPlayers] = useState<PlayerWithScores[]>([])
  const [holes, setHoles] = useState<Hole[]>([])
  const [playerForm, setPlayerForm] = useState({ name: '', pdga_number: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!roundId) return
    supabase
      .from('rounds')
      .select('*, layouts(*, courses(*))')
      .eq('id', roundId)
      .single()
      .then(({ data }) => {
        if (data) {
          setRound(data as unknown as typeof round)
          supabase
            .from('holes')
            .select('*')
            .eq('layout_id', data.layout_id)
            .order('hole_number')
            .then(({ data: hs }) => { if (hs) setHoles(hs) })
        }
      })

    supabase
      .from('players')
      .select('*, scores(*)')
      .eq('round_id', roundId)
      .order('position')
      .then(({ data }) => { if (data) setPlayers(data as unknown as PlayerWithScores[]) })
  }, [roundId])

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!playerForm.name.trim() || !roundId) return
    const nextPos = (players.length + 1) as 1 | 2 | 3 | 4
    if (nextPos > 4) return
    setSaving(true)
    const { data, error } = await supabase
      .from('players')
      .insert({
        round_id: roundId,
        name: playerForm.name.trim(),
        pdga_number: playerForm.pdga_number.trim() || null,
        position: nextPos,
      })
      .select('*, scores(*)')
      .single()
    if (!error && data) {
      setPlayers(prev => [...prev, data as unknown as PlayerWithScores])
      setPlayerForm({ name: '', pdga_number: '' })
    }
    setSaving(false)
  }

  async function updateScore(playerId: string, holeNumber: number, strokes: number | null) {
    const existing = players
      .find(p => p.id === playerId)
      ?.scores.find(s => s.hole_number === holeNumber)

    if (existing) {
      await supabase.from('scores').update({ strokes }).eq('id', existing.id)
    } else {
      await supabase.from('scores').insert({ player_id: playerId, hole_number: holeNumber, strokes })
    }

    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId) return p
      const scores = existing
        ? p.scores.map(s => s.hole_number === holeNumber ? { ...s, strokes } : s)
        : [...p.scores, { id: '', player_id: playerId, hole_number: holeNumber, strokes, created_at: '' }]
      return { ...p, scores }
    }))
  }

  async function setStatus(status: Round['status']) {
    if (!roundId) return
    await supabase.from('rounds').update({ status }).eq('id', roundId)
    setRound(prev => prev ? { ...prev, status } : prev)

    if (status === 'active') {
      await supabase
        .from('stream_state')
        .update({ round_id: roundId, current_hole: 1, mode: 'idle' })
        .eq('id', 'singleton')
    }
  }

  async function removePlayer(id: string) {
    await supabase.from('players').delete().eq('id', id)
    setPlayers(prev => prev.filter(p => p.id !== id))
  }

  if (!round) return <p className="text-gray-400">Loading…</p>

  const totalScore = (p: PlayerWithScores) => {
    const scored = p.scores.filter(s => s.strokes !== null)
    const totalStrokes = scored.reduce((acc, s) => acc + (s.strokes ?? 0), 0)
    const totalPar = scored.reduce((acc, s) => {
      const h = holes.find(h => h.hole_number === s.hole_number)
      return acc + (h?.par ?? 0)
    }, 0)
    return totalStrokes - totalPar
  }

  return (
    <div>
      <Link to="/admin/rounds" className="text-gray-400 hover:text-white text-sm">← Rounds</Link>
      <div className="flex items-center gap-3 mt-1 mb-6">
        <h1 className="text-2xl font-bold">
          {round.name || `Round — ${round.layouts?.name}`}
        </h1>
        <span className="text-gray-400 text-sm">{round.layouts?.courses?.name}</span>
        <div className="ml-auto flex gap-2">
          {round.status === 'pending' && (
            <button onClick={() => setStatus('active')} className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm">
              Activate
            </button>
          )}
          {round.status === 'active' && (
            <button onClick={() => setStatus('completed')} className="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded text-sm">
              Mark Complete
            </button>
          )}
        </div>
      </div>

      {/* Players */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Players ({players.length}/4)</h2>

        {players.length < 4 && (
          <form onSubmit={addPlayer} className="flex gap-2 mb-4">
            <input
              className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
              placeholder="Player name"
              value={playerForm.name}
              onChange={e => setPlayerForm(f => ({ ...f, name: e.target.value }))}
            />
            <input
              className="w-32 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
              placeholder="PDGA #"
              value={playerForm.pdga_number}
              onChange={e => setPlayerForm(f => ({ ...f, pdga_number: e.target.value }))}
            />
            <button
              type="submit"
              disabled={saving || !playerForm.name.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded text-sm font-medium"
            >
              Add
            </button>
          </form>
        )}

        {players.map(p => (
          <div key={p.id} className="flex items-center gap-3 bg-gray-800 rounded px-4 py-2 mb-2">
            <span className="text-gray-400 text-sm w-4">{p.position}</span>
            <span className="flex-1 font-medium">{p.name}</span>
            {p.pdga_number && <span className="text-gray-400 text-xs">#{p.pdga_number}</span>}
            <span className={`text-sm font-bold w-8 text-right ${totalScore(p) < 0 ? 'text-red-400' : totalScore(p) > 0 ? 'text-yellow-400' : 'text-gray-300'}`}>
              {totalScore(p) === 0 ? 'E' : totalScore(p) > 0 ? `+${totalScore(p)}` : totalScore(p)}
            </span>
            <button onClick={() => removePlayer(p.id)} className="text-xs text-red-400 hover:text-red-300 ml-2">
              Remove
            </button>
          </div>
        ))}
      </section>

      {/* Scorecard */}
      {players.length > 0 && holes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Scorecard</h2>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="text-sm border-separate border-spacing-0">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="sticky left-0 bg-gray-900 text-left pb-2 pr-4 font-medium w-28 z-10">Player</th>
                  {holes.map(h => (
                    <th key={h.id} className="pb-2 px-1 font-medium w-10 text-center">
                      <div>{h.hole_number}</div>
                      <div className="text-gray-500 font-normal text-xs">P{h.par}</div>
                    </th>
                  ))}
                  <th className="pb-2 pl-3 font-medium w-12 text-right">T</th>
                </tr>
              </thead>
              <tbody>
                {players.map(p => (
                  <tr key={p.id} className="border-b border-gray-800">
                    <td className="sticky left-0 bg-gray-900 py-2 pr-4 font-medium w-28 z-10 truncate">{p.name}</td>
                    {holes.map(h => {
                      const score = p.scores.find(s => s.hole_number === h.hole_number)
                      return (
                        <td key={h.id} className="py-1 px-0.5 text-center">
                          <input
                            type="number"
                            min="1"
                            max="20"
                            className="w-9 bg-gray-800 border border-gray-700 rounded text-center text-sm py-0.5 focus:border-green-500 outline-none"
                            value={score?.strokes ?? ''}
                            onChange={e => updateScore(p.id, h.hole_number, e.target.value ? parseInt(e.target.value) : null)}
                          />
                        </td>
                      )
                    })}
                    <td className={`py-1 pl-3 font-bold text-right ${totalScore(p) < 0 ? 'text-red-400' : totalScore(p) > 0 ? 'text-yellow-400' : 'text-gray-300'}`}>
                      {totalScore(p) === 0 ? 'E' : totalScore(p) > 0 ? `+${totalScore(p)}` : totalScore(p)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
