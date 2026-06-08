import { useState } from 'react'
import { useStreamState } from '../../lib/useStreamState'

const TEST_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'

export default function StreamPage() {
  const { state, update } = useStreamState()
  const [customUrl, setCustomUrl] = useState('')
  const [saving, setSaving] = useState(false)

  async function setOverride(url: string | null) {
    setSaving(true)
    await update({
      override_hls_url: url,
      mode: url ? 'live' : 'idle',
    })
    setSaving(false)
  }

  const active = state?.override_hls_url

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Stream Control</h1>
      <p className="text-gray-400 text-sm mb-6">
        Set an HLS URL to play on the viewer page. Use the test stream to verify overlays without a live camera.
      </p>

      {/* Current status */}
      <div className="bg-gray-800 rounded-xl p-4 mb-6">
        <div className="text-gray-400 text-xs mb-1">Current mode</div>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-bold ${state?.mode === 'live' ? 'text-red-400' : 'text-gray-300'}`}>
            {state?.mode?.toUpperCase() ?? 'LOADING'}
          </span>
          {active && (
            <span className="text-xs text-gray-400 truncate max-w-xs">{active}</span>
          )}
        </div>
      </div>

      {/* Test stream */}
      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <div className="font-medium mb-1">Mux test stream</div>
        <div className="text-gray-400 text-xs mb-3 font-mono">{TEST_STREAM}</div>
        <div className="flex gap-2">
          <button
            onClick={() => setOverride(TEST_STREAM)}
            disabled={saving || active === TEST_STREAM}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded text-sm font-medium"
          >
            {active === TEST_STREAM ? 'Active' : 'Play Test Stream'}
          </button>
          {active === TEST_STREAM && (
            <button
              onClick={() => setOverride(null)}
              disabled={saving}
              className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded text-sm"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Custom URL */}
      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <div className="font-medium mb-3">Custom HLS URL</div>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm font-mono"
            placeholder="https://..."
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
          />
          <button
            onClick={() => { setOverride(customUrl); setCustomUrl('') }}
            disabled={saving || !customUrl.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-sm font-medium"
          >
            Play
          </button>
        </div>
      </div>

      {/* Stop all */}
      {active && (
        <button
          onClick={() => setOverride(null)}
          disabled={saving}
          className="w-full bg-red-800 hover:bg-red-700 disabled:opacity-50 py-3 rounded-xl font-medium"
        >
          Stop Stream → Idle
        </button>
      )}
    </div>
  )
}
