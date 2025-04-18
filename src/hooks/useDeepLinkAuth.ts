import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '@/lib/integrations/supabase'
import { SpotifyAuthService } from '@/lib/integrations/spotify/spotifyAuth'
import { error as logError } from '@tauri-apps/plugin-log'

export const useDeepLinkAuth = () => {
  const navigate = useNavigate()
  const [isHandlingAuth, setIsHandlingAuth] = useState(false)

  useEffect(() => {
    const urlObj = new URL(window.location.href)
    const searchParams = new URLSearchParams(urlObj.search)
    const code = searchParams.get('code')

    if (code) {
      setIsHandlingAuth(true)
    }

    const handleUrl = async (urls: string[]) => {
      try {
        setIsHandlingAuth(true)
        const url = urls[0]
        
        const urlObj = new URL(url)
        const searchParams = new URLSearchParams(urlObj.search.substring(1))

        // Check if this is a Spotify callback
        if (url.includes('spotify/callback')) {
          const spotifyCode = searchParams.get('code')
          const state = searchParams.get('state')
          if (spotifyCode && state) {
            await SpotifyAuthService.handleCallback(spotifyCode, state)
            navigate('/start-flow', { replace: true })
            window.location.reload()
            return
          }
        }

        // Handle Supabase auth if not Spotify
        const code = searchParams.get('code')
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          if (data.session) navigate('/')
          return
        }
      } catch (err) {
        logError(`Error handling deep link: ${err}`)
      } finally {
        setIsHandlingAuth(false)
      }
    }

    onOpenUrl(handleUrl)
  }, [navigate])

  return isHandlingAuth
}
