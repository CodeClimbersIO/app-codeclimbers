import { useState, useEffect } from 'react'

export type Playlist = {
  id: string
  name: string
  uri?: string
}

export type MusicService = {
  type: 'spotify' | 'apple'
  connected: boolean
  playlists: Playlist[]
}

export const useMusicService = () => {
  const [musicService, setMusicService] = useState<MusicService | null>(null)
  const [loading, setLoading] = useState(true)

  const connectToSpotify = async () => {
    const CLIENT_ID = '3b4d2c2e543f452392fe17f1a167ee29'
    const REDIRECT_URI = 'http://localhost:5173/callback'
    const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize'
    const SCOPES = [
      'user-read-private',
      'playlist-read-private',
      'user-read-playback-state',
      'user-modify-playback-state',
      'streaming'
    ]

    localStorage.setItem('returnTo', window.location.pathname)

    const loginUrl = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPES.join('%20')}&response_type=token`
    window.location.href = loginUrl
  }

  const fetchPlaylists = async () => {
    const token = localStorage.getItem('spotify_token')
    if (!token) return []

    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    const data = await response.json()
    return data.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      uri: item.uri
    }))
  }

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('spotify_token')
      if (token) {
        try {
          const playlists = await fetchPlaylists()
          setMusicService({
            type: 'spotify',
            connected: true,
            playlists
          })
        } catch (error) {
          localStorage.removeItem('spotify_token')
          setMusicService(null)
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  return {
    musicService,
    loading,
    connectToSpotify
  }
} 