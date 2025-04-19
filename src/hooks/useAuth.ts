import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import supabase from '@/lib/integrations/supabase'
import { error as logError } from '@tauri-apps/plugin-log'
import { userApi } from '@/api/ebbApi/userApi'
import { deviceApi } from '@/api/ebbApi/deviceApi'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = async () => {
    const deviceId = await deviceApi.getMacAddress()
    if (!deviceId || !user) {
      return { error: new Error('Device ID or user is not set') }
    }

    const { error: deleteError } = await userApi.deleteDevice(user.id, deviceId)

    if (deleteError) {
      return { error: deleteError }
    }

    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      return { error: signOutError }
    }

    return { error: null }
  }

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (isMounted) {
        setUser(initialSession?.user ?? null)
        setSession(initialSession)
        setLoading(false)
      }
    }).catch((error) => {
      logError(`[useAuth Simple] Error getting initial session: ${error}`)
      if (isMounted) {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, changedSession) => {
      if (isMounted) {
        setUser(changedSession?.user ?? null)
        setSession(changedSession)
        setLoading(loading => loading ? false : false) 
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { user, session, loading, logout }
}
