import { useEffect } from 'react'
import './App.css'
import { AppRouter } from './routes'
import { ThemeProvider } from '@/components/ThemeProvider'
import supabase from '@/lib/integrations/supabase'
import { error as logError } from '@tauri-apps/plugin-log'
import { invoke } from '@tauri-apps/api/core'
import { setupTray } from './lib/tray'

const App = () => {

  useEffect(() => {
    const init = async () => {
      try {
        await supabase.auth.getSession()

        await setupTray()
        const hasPermissions = await invoke<boolean>('check_accessibility_permissions')

        if (hasPermissions) {
          await invoke('start_system_monitoring')
        }
      } catch (error) {
        logError(`Error during initialization: ${error}`)
      }
    }

    init()
  }, [])

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <main>
        <AppRouter />
      </main>
    </ThemeProvider>
  )
}

export default App
