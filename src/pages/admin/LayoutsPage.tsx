import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Course, Layout } from '../../types/database'

export default function LayoutsPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const [course, setCourse] = useState<Course | null>(null)
  const [layouts, setLayouts] = useState<Layout[]>([])
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!courseId) return
    supabase.from('courses').select('*').eq('id', courseId).single().then(({ data }) => {
      if (data) setCourse(data)
    })
    supabase.from('layouts').select('*').eq('course_id', courseId).order('created_at').then(({ data }) => {
      if (data) setLayouts(data)
    })
  }, [courseId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !courseId) return
    setSaving(true)
    const { data, error } = await supabase
      .from('layouts')
      .insert({ course_id: courseId, name: name.trim() })
      .select()
      .single()
    if (!error && data) {
      setLayouts(prev => [...prev, data])
      setName('')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('layouts').delete().eq('id', id)
    setLayouts(prev => prev.filter(l => l.id !== id))
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Link to="/admin/courses" className="text-gray-400 hover:text-white text-sm">← Courses</Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">
        Layouts — <span className="text-green-400">{course?.name}</span>
      </h1>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
          placeholder="Layout name (e.g. Pro, Recreational)"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded text-sm font-medium"
        >
          Add
        </button>
      </form>

      {layouts.length === 0 ? (
        <p className="text-gray-400 text-sm">No layouts yet.</p>
      ) : (
        <ul className="space-y-2">
          {layouts.map(layout => (
            <li key={layout.id} className="flex items-center gap-3 bg-gray-800 rounded px-4 py-3">
              <span className="flex-1 font-medium">{layout.name}</span>
              <Link
                to={`/admin/layouts/${layout.id}/holes`}
                className="text-xs text-gray-400 hover:text-white"
              >
                Holes →
              </Link>
              <button
                onClick={() => handleDelete(layout.id)}
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
