import { useEffect } from 'react'
import './App.css'
import { AppRouter } from './routes'
import { ThemeProvider } from '@/components/ThemeProvider'
import supabase from '@/lib/utils/supabase'
import { trace, info, error } from '@tauri-apps/plugin-log'

const App = () => {
  trace('Trace')
  info('Info')
  error('Error')

  useEffect(() => {
    const initAuth = async () => {
      try {
        await supabase.auth.getSession()
      } catch (error) {
        console.error('Error initializing auth:', error)
      }
    }

    initAuth()
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
