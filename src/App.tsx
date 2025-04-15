import { useEffect } from 'react'
import './App.css'
import { AppRouter } from './routes'
import { ThemeProvider } from '@/components/ThemeProvider'
import supabase from '@/lib/integrations/supabase'
import { invoke } from '@tauri-apps/api/core'
import { setupTray } from './lib/tray'
import { initSentry } from '@/components/Sentry'
import { useUpdate } from './hooks/useUpdate'
import { useAuth } from './hooks/useAuth'
import { useDeviceRegistration } from './hooks/useDeviceRegistration'
import { usePostHog } from 'posthog-js/react'
import { useShortcutStore } from '@/lib/stores/shortcutStore'
import { useLicenseStore } from '@/stores/licenseStore'

const App = () => {
  const posthog = usePostHog()
  const { beginCheckForUpdates } = useUpdate()
  const { user } = useAuth()
  const { loadShortcutFromStorage } = useShortcutStore()
  const fetchLicense = useLicenseStore((state) => state.fetchLicense)
  const initSubscription = useLicenseStore((state) => state.initSubscription)
  const clearSubscription = useLicenseStore((state) => state.clearSubscription)
  useDeviceRegistration()

  useEffect(() => {
    initSentry()

    const init = async () => {
      await supabase.auth.getSession()
      await setupTray()
      const hasPermissions = await invoke<boolean>('check_accessibility_permissions')
      beginCheckForUpdates()

      if (hasPermissions) {
        await invoke('start_system_monitoring')
      }
    }

    init()
  }, [])

  useEffect(() => {
    if (user) {
      posthog.identify(user.id, {
        email: user.email,
      })
      fetchLicense(user.id)
      initSubscription(user.id)
    } else {
      fetchLicense(null) // Clear license if user logs out
      clearSubscription()
    }

    // Cleanup subscription on component unmount or user change
    return () => {
      clearSubscription()
    }
  }, [user, fetchLicense, initSubscription, clearSubscription, posthog])

  useEffect(() => {
    loadShortcutFromStorage()
  }, [loadShortcutFromStorage])

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AppRouter />
    </ThemeProvider>
  )
}

export default App
