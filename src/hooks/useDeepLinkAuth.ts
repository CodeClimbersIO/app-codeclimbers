import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '@/lib/integrations/supabase'
import { SpotifyAuthService } from '@/lib/integrations/spotify/spotifyAuth'
import { error as logError } from '@tauri-apps/plugin-log'
import { useLicenseStore } from '@/stores/licenseStore'
import { useAuth } from './useAuth'

export const useDeepLinkAuth = () => {
  const navigate = useNavigate()
  const [isHandlingAuth, setIsHandlingAuth] = useState(false)
  const { user } = useAuth()
  const fetchLicense = useLicenseStore((state) => state.fetchLicense)

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

        // Check if this is a license success callback
        if (url.includes('license/success')) {
          if (user) {
            await fetchLicense(user.id)
          }
          navigate('/')
          return
        }

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
  }, [navigate, user, fetchLicense])

  return isHandlingAuth
}
