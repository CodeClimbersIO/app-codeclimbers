import { openUrl } from '@tauri-apps/plugin-opener'

const SPOTIFY_CONFIG = {
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
  clientSecret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET,
  scopes: [
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'playlist-read-collaborative',
    'streaming',
    'user-read-playback-state',
    'user-modify-playback-state',
  ].join(' '),
  redirectUri: import.meta.env.DEV 
    ? 'http://localhost:1420/settings?spotify=callback'
    : 'https://ebb.cool/spotify-success'
}

interface SpotifyTokens {
  access_token: string
  refresh_token: string
  expires_at: string
}

interface SpotifyUserProfile {
  email: string
  display_name: string | null
  id: string
  product: string
}

interface SpotifyPlaylist {
  id: string
  name: string
}

const STORAGE_KEY = 'spotify_tokens'

// Store state in localStorage to verify in callback
const STATE_KEY = 'spotify_auth_state'

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

export interface PlaybackState {
  track_window: {
    current_track: {
      name: string;
      artists: Array<{ name: string }>;
    };
  };
  paused: boolean;
  duration: number;
  position: number;
}

declare global {
  namespace Spotify {
    interface Player {
      addListener(event: 'player_state_changed', callback: (state: PlaybackState | null) => void): void;
      addListener(event: 'ready', callback: (data: { device_id: string }) => void): void;
      connect(): Promise<boolean>;
      disconnect(): void;
    }
  }

  interface Window {
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => Spotify.Player;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

export class SpotifyService {
  private static getStoredTokens(): SpotifyTokens | null {
    const tokens = localStorage.getItem(STORAGE_KEY)
    return tokens ? JSON.parse(tokens) : null
  }

  private static setStoredTokens(tokens: SpotifyTokens): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
  }

  private static clearStoredTokens(): void {
    localStorage.removeItem(STORAGE_KEY)
  }

  static async isConnected(): Promise<boolean> {
    const tokens = this.getStoredTokens()
    if (!tokens) return false

    const expiresAt = new Date(tokens.expires_at)
    const now = new Date()
    
    if (expiresAt <= now) {
      // Try to refresh the token
      try {
        await this.refreshAccessToken()
        return true
      } catch {
        return false
      }
    }

    return true
  }

  static async connect(): Promise<void> {
    const state = crypto.randomUUID()
    localStorage.setItem('spotify_auth_state', state)
    
    const params = new URLSearchParams({
      client_id: SPOTIFY_CONFIG.clientId,
      response_type: 'code',
      redirect_uri: SPOTIFY_CONFIG.redirectUri,
      state: state,
      scope: SPOTIFY_CONFIG.scopes,
      show_dialog: 'true'
    })

    const url = `https://accounts.spotify.com/authorize?${params.toString()}`
    
    if (import.meta.env.DEV) {
      window.location.href = url
    } else {
      await openUrl(url)
    }
  }

  static async handleCallback(code: string, state: string | null): Promise<void> {
    try {
      
      // Verify state matches what we stored
      const storedState = localStorage.getItem(STATE_KEY)
      
      if (state === null || state !== storedState) {
        throw new Error('State mismatch')
      }
      
      // Clear stored state
      localStorage.removeItem(STATE_KEY)

      const tokens = await this.exchangeCodeForTokens(code)
      
      this.setStoredTokens({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      })

      // Verify connection by fetching profile
      const profile = await this.getUserProfile()
      if (!profile) {
        throw new Error('Failed to verify connection')
      }
    } catch (error) {
      console.error('Error in handleCallback:', error)
      throw error
    }
  }

  static async disconnect(): Promise<void> {
    this.clearStoredTokens()
  }

  private static async exchangeCodeForTokens(code: string) {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${SPOTIFY_CONFIG.clientId}:${SPOTIFY_CONFIG.clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: SPOTIFY_CONFIG.redirectUri,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to exchange code for tokens: ${errorText}`)
    }

    return response.json()
  }

  private static async refreshAccessToken(): Promise<void> {
    const tokens = this.getStoredTokens()
    if (!tokens?.refresh_token) throw new Error('No refresh token available')

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${SPOTIFY_CONFIG.clientId}:${SPOTIFY_CONFIG.clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to refresh token')
    }

    const newTokens = await response.json()
    this.setStoredTokens({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token ?? tokens.refresh_token,
      expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
    })
  }

  static async getAccessToken(): Promise<string> {
    const tokens = this.getStoredTokens()
    if (!tokens) throw new Error('No Spotify tokens available')

    const expiresAt = new Date(tokens.expires_at)
    if (expiresAt <= new Date()) {
      await this.refreshAccessToken()
      return this.getStoredTokens()!.access_token
    }

    return tokens.access_token
  }

  static async getUserProfile(): Promise<SpotifyUserProfile | null> {
    try {
      const response = await fetch(`${SPOTIFY_API_BASE}/me`, {
        headers: {
          'Authorization': `Bearer ${await this.getAccessToken()}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch user profile')
      }
      
      const data = await response.json()
      return {
        email: data.email,
        display_name: data.display_name,
        id: data.id,
        product: data.product
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  static async getUserPlaylists(): Promise<{ id: string, name: string }[]> {
    try {
      const response = await fetch(`${SPOTIFY_API_BASE}/me/playlists?limit=50`, {
        headers: {
          'Authorization': `Bearer ${await this.getAccessToken()}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch playlists')
      }
      
      const data = await response.json()
      return data.items.map((playlist: SpotifyPlaylist) => ({
        id: playlist.id,
        name: playlist.name
      }))
    } catch (error) {
      console.error('Error fetching playlists:', error)
      return []
    }
  }

  static async initializePlayer(): Promise<void> {
    // Load Spotify Web Playback SDK
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    document.body.appendChild(script)

    return new Promise((resolve) => {
      window.onSpotifyWebPlaybackSDKReady = () => {
        resolve()
      }
    })
  }

  static async createPlayer(): Promise<Spotify.Player> {
    const token = await this.getAccessToken()
    const player = new window.Spotify.Player({
      name: 'Ebb Flow Player',
      getOAuthToken: cb => cb(token),
      volume: 0.5
    })

    await player.connect()
    return player
  }

  static async startPlayback(playlistId: string, deviceId: string): Promise<void> {
    const token = await this.getAccessToken()
    
    await fetch(`${SPOTIFY_API_BASE}/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context_uri: `spotify:playlist:${playlistId}`,
        shuffle: true,
      }),
    })
  }

  static async controlPlayback(action: 'play' | 'pause' | 'next' | 'previous', deviceId: string): Promise<void> {
    const token = await this.getAccessToken()
    
    if (action === 'play') {
      await fetch(`${SPOTIFY_API_BASE}/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })
    } else if (action === 'pause') {
      await fetch(`${SPOTIFY_API_BASE}/me/player/pause?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })
    } else {
      await fetch(`${SPOTIFY_API_BASE}/me/player/${action}?device_id=${deviceId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })
    }
  }
} 
