import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Round, Layout, Course } from '../../types/database'

type RoundWithLayout = Round & { layouts: (Layout & { courses: Course }) }

export default function RoundsPage() {
  const [rounds, setRounds] = useState<RoundWithLayout[]>([])
  const [layouts, setLayouts] = useState<(Layout & { courses: Course })[]>([])
  const [form, setForm] = useState({ layout_id: '', name: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('rounds')
      .select('*, layouts(*, courses(*))')
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setRounds(data as unknown as RoundWithLayout[]) })

    supabase
      .from('layouts')
      .select('*, courses(*)')
      .order('created_at')
      .then(({ data }) => { if (data) setLayouts(data as unknown as (Layout & { courses: Course })[]) })
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.layout_id) return
    setSaving(true)
    const { data, error } = await supabase
      .from('rounds')
      .insert({ layout_id: form.layout_id, name: form.name.trim() || null, status: 'pending' })
      .select('*, layouts(*, courses(*))')
      .single()
    if (!error && data) {
      setRounds(prev => [data as unknown as RoundWithLayout, ...prev])
      setForm({ layout_id: '', name: '' })
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('rounds').delete().eq('id', id)
    if (error) {
      alert(`Could not delete round: ${error.message}`)
      return
    }
    setRounds(prev => prev.filter(r => r.id !== id))
  }

  const statusBadge = (status: Round['status']) => {
    const map = {
      pending: 'bg-yellow-800 text-yellow-200',
      active: 'bg-green-800 text-green-200',
      completed: 'bg-gray-700 text-gray-300',
    }
    return `text-xs px-2 py-0.5 rounded ${map[status]}`
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Rounds</h1>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6 flex-wrap">
        <select
          className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
          value={form.layout_id}
          onChange={e => setForm(f => ({ ...f, layout_id: e.target.value }))}
        >
          <option value="">Select layout…</option>
          {layouts.map(l => (
            <option key={l.id} value={l.id}>
              {l.courses.name} — {l.name}
            </option>
          ))}
        </select>
        <input
          className="w-48 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
          placeholder="Round name (optional)"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        <button
          type="submit"
          disabled={saving || !form.layout_id}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded text-sm font-medium"
        >
          Create Round
        </button>
      </form>

      {rounds.length === 0 ? (
        <p className="text-gray-400 text-sm">No rounds yet.</p>
      ) : (
        <ul className="space-y-2">
          {rounds.map(round => (
            <li key={round.id} className="flex items-center gap-3 bg-gray-800 rounded px-4 py-3">
              <div className="flex-1">
                <Link to={`/admin/rounds/${round.id}`} className="font-medium hover:text-green-400">
                  {round.name || `Round — ${round.layouts?.name}`}
                </Link>
                <div className="text-gray-400 text-xs mt-0.5">
                  {round.layouts?.courses?.name} · {round.layouts?.name}
                </div>
              </div>
              <span className={statusBadge(round.status)}>{round.status}</span>
              <Link to={`/admin/rounds/${round.id}`} className="text-xs text-gray-400 hover:text-white ml-2">
                Manage →
              </Link>
              <button
                onClick={() => handleDelete(round.id)}
                className="text-xs text-red-400 hover:text-red-300 ml-2"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
