import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Course } from '../../types/database'

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('courses').select('*').order('created_at').then(({ data }) => {
      if (data) setCourses(data)
      setLoading(false)
    })
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('courses')
      .insert({ name: name.trim(), location: location.trim() || null })
      .select()
      .single()
    if (!error && data) {
      setCourses(prev => [...prev, data])
      setName('')
      setLocation('')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('courses').delete().eq('id', id)
    setCourses(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <p className="text-gray-400">Loading…</p>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Courses</h1>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
          placeholder="Course name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className="w-40 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
          placeholder="Location"
          value={location}
          onChange={e => setLocation(e.target.value)}
        />
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded text-sm font-medium"
        >
          Add
        </button>
      </form>

      {courses.length === 0 ? (
        <p className="text-gray-400 text-sm">No courses yet.</p>
      ) : (
        <ul className="space-y-2">
          {courses.map(course => (
            <li key={course.id} className="flex items-center gap-3 bg-gray-800 rounded px-4 py-3">
              <div className="flex-1">
                <Link
                  to={`/admin/courses/${course.id}/layouts`}
                  className="font-medium hover:text-green-400"
                >
                  {course.name}
                </Link>
                {course.location && (
                  <span className="text-gray-400 text-sm ml-2">{course.location}</span>
                )}
              </div>
              <Link
                to={`/admin/courses/${course.id}/layouts`}
                className="text-xs text-gray-400 hover:text-white"
              >
                Layouts →
              </Link>
              <button
                onClick={() => handleDelete(course.id)}
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
