import { invoke } from '@tauri-apps/api/core'
import { SpotifyApiService } from './spotifyApi'
import { isDev } from '../../utils/environment'

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
  redirectUri: isDev() 
    ? 'http://localhost:1420/start-flow?spotify=callback'
    : 'https://ebb.cool/spotify-success'
}

interface SpotifyTokens {
  access_token: string
  refresh_token: string
  expires_at: string
}

interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  scope: string
  expires_in: number
  refresh_token: string
}

const STORAGE_KEY = 'spotify_tokens'

// Store state in localStorage to verify in callback
const STATE_KEY = 'spotify_auth_state'

export class SpotifyAuthService {
  private static CODE_VERIFIER_KEY = 'spotify_code_verifier'

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

  private static async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(codeVerifier)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  private static generateCodeVerifier(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
      .substring(0, 128)
  }

  static async connect(): Promise<void> {
    // Clear any existing tokens first
    this.clearStoredTokens()
    
    const state = crypto.randomUUID()
    localStorage.setItem(STATE_KEY, state)
    
    // Generate and store PKCE values
    const codeVerifier = this.generateCodeVerifier()
    localStorage.setItem(this.CODE_VERIFIER_KEY, codeVerifier)
    const codeChallenge = await this.generateCodeChallenge(codeVerifier)
    
    const params = new URLSearchParams({
      client_id: SPOTIFY_CONFIG.clientId,
      response_type: 'code',
      redirect_uri: SPOTIFY_CONFIG.redirectUri,
      state: state,
      scope: SPOTIFY_CONFIG.scopes,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      show_dialog: 'true'
    })

    const url = `https://accounts.spotify.com/authorize?${params.toString()}`
    
    if (isDev()) {
      window.location.href = url
    } else {
      await invoke('plugin:shell|open', { path: url })
    }
  }

  static async handleCallback(code: string, state: string | null): Promise<void> {
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
    const profile = await SpotifyApiService.getUserProfile()
    if (!profile) {
      throw new Error('Failed to verify connection')
    }
  }

  static async disconnect(): Promise<void> {
    this.clearStoredTokens()
  }

  private static async exchangeCodeForTokens(code: string): Promise<SpotifyTokenResponse> {
    const codeVerifier = localStorage.getItem(this.CODE_VERIFIER_KEY)
    
    if (!codeVerifier) {
      throw new Error('Code verifier not found')
    }
    localStorage.removeItem(this.CODE_VERIFIER_KEY)

    const params = new URLSearchParams({
      client_id: SPOTIFY_CONFIG.clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: SPOTIFY_CONFIG.redirectUri,
      code_verifier: codeVerifier
    })

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    })

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens')
    }

    return response.json()
  }

  static async refreshAccessToken(): Promise<SpotifyTokens | undefined> {
    const tokens = this.getStoredTokens()
    if (!tokens?.refresh_token) throw new Error('No refresh token available')

    const url = 'https://accounts.spotify.com/api/token'

    const payload = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        client_id: SPOTIFY_CONFIG.clientId
      }),
    }

    const response = await fetch(url, payload)
      
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`)
    }
      
    const data = await response.json()
      
    this.setStoredTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? tokens.refresh_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
    })
      
    return data
  }

  static async getAuth(): Promise<SpotifyTokens | undefined> {
    const tokens = this.getStoredTokens()
    if (!tokens) return

    const expiresAt = new Date(tokens.expires_at)
    const now = new Date()
    
    if (expiresAt <= now) {
      return this.refreshAccessToken()
    }

    return tokens
  }

  static async isConnected(): Promise<boolean> {
    const tokens = await this.getAuth()
    return Boolean(tokens)
  }

  static async getAccessToken(): Promise<string> {
    const tokens = await this.getAuth()
    if (!tokens) throw new Error('Not connected to Spotify')

    return tokens.access_token
  }
  
} 
