import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '@/lib/utils/supabase'

export const useDeepLinkAuth = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handleUrl = async (urls: string[]) => {
      try {
        const url = urls[0]
        
        // Parse the URL and get the hash
        const urlObj = new URL(url)
        const hashParams = new URLSearchParams(urlObj.hash.substring(1))
        const searchParams = urlObj.searchParams

        const accessToken = hashParams.get('access_token') || searchParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token')

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (error) {
            console.error('Session error:', error)
            throw error
          }
          
          if (data.session) {
            navigate('/')
          }
        } else {
          throw new Error('Missing required tokens in URL')
        }
      } catch (err) {
        console.error('Error handling deep link:', err)
        navigate('/login')
      }
    }

    onOpenUrl(handleUrl)
  }, [navigate])
}
