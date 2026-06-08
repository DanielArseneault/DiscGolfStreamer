import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Hole, Layout } from '../../types/database'

export default function HolesPage() {
  const { layoutId } = useParams<{ layoutId: string }>()
  const [layout, setLayout] = useState<Layout | null>(null)
  const [holes, setHoles] = useState<Hole[]>([])
  const [form, setForm] = useState({ hole_number: '', par: '3', distance_meters: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!layoutId) return
    supabase.from('layouts').select('*').eq('id', layoutId).single().then(({ data }) => {
      if (data) setLayout(data)
    })
    supabase.from('holes').select('*').eq('layout_id', layoutId).order('hole_number').then(({ data }) => {
      if (data) setHoles(data)
    })
  }, [layoutId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!layoutId || !form.hole_number || !form.par) return
    setSaving(true)
    const { data, error } = await supabase
      .from('holes')
      .insert({
        layout_id: layoutId,
        hole_number: parseInt(form.hole_number),
        par: parseInt(form.par),
        distance_meters: form.distance_meters ? parseInt(form.distance_meters) : null,
      })
      .select()
      .single()
    if (!error && data) {
      setHoles(prev => [...prev, data].sort((a, b) => a.hole_number - b.hole_number))
      setForm(f => ({ ...f, hole_number: String(parseInt(f.hole_number) + 1) }))
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('holes').delete().eq('id', id)
    setHoles(prev => prev.filter(h => h.id !== id))
  }

  return (
    <div>
      <Link to={`/admin/courses/${layout?.course_id}/layouts`} className="text-gray-400 hover:text-white text-sm">
        ← Layouts
      </Link>
      <h1 className="text-2xl font-bold mt-1 mb-6">
        Holes — <span className="text-green-400">{layout?.name}</span>
      </h1>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6 flex-wrap">
        <input
          className="w-24 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
          placeholder="Hole #"
          type="number"
          min="1"
          value={form.hole_number}
          onChange={e => setForm(f => ({ ...f, hole_number: e.target.value }))}
        />
        <input
          className="w-20 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
          placeholder="Par"
          type="number"
          min="2"
          max="6"
          value={form.par}
          onChange={e => setForm(f => ({ ...f, par: e.target.value }))}
        />
        <input
          className="w-32 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
          placeholder="Distance (m)"
          type="number"
          min="0"
          value={form.distance_meters}
          onChange={e => setForm(f => ({ ...f, distance_meters: e.target.value }))}
        />
        <button
          type="submit"
          disabled={saving || !form.hole_number || !form.par}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded text-sm font-medium"
        >
          Add Hole
        </button>
      </form>

      {holes.length === 0 ? (
        <p className="text-gray-400 text-sm">No holes yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-left border-b border-gray-700">
              <th className="pb-2 pr-4">Hole</th>
              <th className="pb-2 pr-4">Par</th>
              <th className="pb-2 pr-4">Distance</th>
              <th className="pb-2 pr-4">Media</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {holes.map(hole => (
              <tr key={hole.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="py-2 pr-4 font-medium">{hole.hole_number}</td>
                <td className="py-2 pr-4">{hole.par}</td>
                <td className="py-2 pr-4">
                  {hole.distance_meters ? `${hole.distance_meters}m` : '—'}
                </td>
                <td className="py-2 pr-4">
                  {hole.mux_playback_id ? (
                    <span className="text-green-400">✓ Video</span>
                  ) : (
                    <span className="text-gray-500">No media</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => handleDelete(hole.id)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
