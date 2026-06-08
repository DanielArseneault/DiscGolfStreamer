import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOperator } from '../../lib/useOperator'

export default function OperatorSetup() {
  const { operator, loading, register } = useOperator()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && operator) navigate('/operator/live', { replace: true })
  }, [operator, loading, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      await register(name.trim())
      navigate('/operator/live', { replace: true })
    } catch {
      setError('Could not connect. Check your internet and try again.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Connecting…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🥏</div>
          <h1 className="text-3xl font-bold text-white">Disc Golf Pilot</h1>
          <p className="text-gray-400 mt-2 text-sm">Camera operator console</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Your name
            </label>
            <input
              autoFocus
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white text-base focus:border-green-500 focus:outline-none"
              placeholder="e.g. Camera Op 1"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-base transition-colors"
          >
            {saving ? 'Connecting…' : 'Join as Operator'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/viewer"
            className="text-sm text-gray-500 hover:text-gray-300"
          >
            Open viewer page →
          </a>
        </div>
        <div className="mt-2 text-center">
          <a
            href="/admin"
            className="text-sm text-gray-500 hover:text-gray-300"
          >
            Admin →
          </a>
        </div>
      </div>
    </div>
  )
}
