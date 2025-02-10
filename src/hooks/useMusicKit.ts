import { useState, useCallback } from 'react'

declare global {
  interface Window {
    MusicKit: {
      configure: (options: { developerToken: string }) => Promise<MusicKit>
      getInstance: () => MusicKit
    }
    music: MusicKit
  }
}

interface MusicKit {
  isAuthorized: boolean
  authorize: () => Promise<void>
  addEventListener: (event: string, callback: () => void) => void
  api: {
    library: {
      playlists: () => Promise<Array<{
        id: string
        attributes: { name: string }
      }>>
    }
  }
}

interface AppleMusicPlaylist {
  id: string
  attributes: {
    name: string
  }
}

export const useMusicKit = () => {
  const [isAuthorized, setIsAuthorized] = useState(false)

  const initialize = useCallback(async () => {
    try {
      if (!window.MusicKit) {
        console.error('MusicKit is not loaded')
        return
      }

      console.log('Configuring MusicKit...')
      await window.MusicKit.configure({
        developerToken: import.meta.env.VITE_APPLE_MUSIC_TOKEN
      })
      
      const music = window.MusicKit.getInstance()
      console.log('MusicKit configured:', music)
      setIsAuthorized(music.isAuthorized)
      
      music.addEventListener('authorizationStatusDidChange', () => {
        console.log('Auth status changed:', music.isAuthorized)
        setIsAuthorized(music.isAuthorized)
      })

    } catch (error) {
      console.error('Failed to initialize MusicKit:', error)
    }
  }, [])

  const authorize = useCallback(async () => {
    try {
      console.log('Starting authorization...')
      const music = window.MusicKit.getInstance()
      console.log('Got MusicKit instance:', music)
      console.log('Current authorization status:', music.isAuthorized)
      
      const result = await music.authorize()
      console.log('Authorization result:', result)
      
    } catch (error) {
      console.error('Failed to authorize MusicKit:', error)
      throw error
    }
  }, [])

  const fetchPlaylists = useCallback(async () => {
    try {
      const music = window.MusicKit.getInstance()
      const response = await music.api.library.playlists()
      return response.map((playlist: AppleMusicPlaylist) => ({
        id: playlist.id,
        name: playlist.attributes.name
      }))
    } catch (error) {
      console.error('Failed to fetch playlists:', error)
      return []
    }
  }, [])

  return {
    initialize,
    isAuthorized,
    authorize,
    fetchPlaylists
  }
}
