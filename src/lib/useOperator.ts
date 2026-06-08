import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import type { Operator } from '../types/database'

const STORAGE_KEY = 'dg_operator_id'

export function useOperator() {
  const [operator, setOperator] = useState<Operator | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      supabase
        .from('operators')
        .select('*')
        .eq('id', stored)
        .single()
        .then(({ data }) => {
          if (data) {
            setOperator(data)
            // Update last_seen_at
            supabase
              .from('operators')
              .update({ last_seen_at: new Date().toISOString() })
              .eq('id', data.id)
          }
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  async function register(name: string) {
    const { data, error } = await supabase
      .from('operators')
      .insert({ name })
      .select()
      .single()
    if (error) throw error
    localStorage.setItem(STORAGE_KEY, data.id)
    setOperator(data)
    return data
  }

  function forget() {
    localStorage.removeItem(STORAGE_KEY)
    setOperator(null)
  }

  return { operator, loading, register, forget }
}
