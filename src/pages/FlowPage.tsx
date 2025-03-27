import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FlowSession } from '@/db/ebb/flowSessionRepo'
import { DateTime, Duration } from 'luxon'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FlowSessionApi } from '../api/ebbApi/flowSessionApi'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Music, Loader2 } from 'lucide-react'
import { SpotifyIcon } from '@/components/icons/SpotifyIcon'
import { PlaybackState, SpotifyApiService } from '@/lib/integrations/spotify/spotifyApi'
import { SpotifyAuthService } from '@/lib/integrations/spotify/spotifyAuth'
import { invoke } from '@tauri-apps/api/core'
import NotificationManager from '@/lib/notificationManager'
import { listen } from '@tauri-apps/api/event'
import { useRustEvents } from '@/hooks/useRustEvents'
import { useFlowTimer } from '../lib/stores/flowTimer'

const getDurationFormatFromSeconds = (seconds: number) => {
  const duration = Duration.fromMillis(seconds * 1000)
  const format = duration.as('minutes') >= 60 ? 'hh:mm:ss' : 'mm:ss'
  return duration.toFormat(format)
}

const MAX_SESSION_DURATION = 8 * 60 * 60 // 8 hours in seconds

const Timer = ({ flowSession }: { flowSession: FlowSession | null }) => {
  const [time, setTime] = useState<string>('00:00')
  const [isAddingTime, setIsAddingTime] = useState(false)
  const [cooldown, setCooldown] = useState(false)
  const [hasShownWarning, setHasShownWarning] = useState(false)

  const handleAddTime = async () => {
    if (!flowSession || !flowSession.duration || isAddingTime || cooldown) return

    try {
      setIsAddingTime(true)
      setCooldown(true)

      // Calculate the new total duration
      const additionalSeconds = 15 * 60 // 15 minutes in seconds
      const newTotalDuration = flowSession.duration + additionalSeconds

      // Update the session duration on the server
      await FlowSessionApi.updateFlowSessionDuration(flowSession.id, newTotalDuration)
      useFlowTimer.setState({ duration: Duration.fromObject({ seconds: newTotalDuration }) })

      // Update the flowSession object directly
      flowSession.duration = newTotalDuration
    } catch (error) {
      console.error('Failed to extend session duration:', error)
    } finally {
      setIsAddingTime(false)
      // Set a 3 second cooldown
      setTimeout(() => {
        setCooldown(false)
      }, 1000)
    }
  }

  useEffect(() => {
    if (!flowSession) return

    const updateTimer = () => {
      const now = DateTime.now()
      const nowAsSeconds = now.toSeconds()
      const startTime = DateTime.fromISO(flowSession.start).toSeconds()
      const diff = nowAsSeconds - startTime

      // Check for max duration limit for unlimited sessions
      if (!flowSession.duration && diff >= MAX_SESSION_DURATION) {
        window.dispatchEvent(new CustomEvent('flowSessionComplete'))
        return
      }

      if (flowSession.duration) {
        const remaining = (flowSession.duration) - diff
        if (remaining <= 0) {
          window.dispatchEvent(new CustomEvent('flowSessionComplete'))
          return
        }

        // Show warning notification when 1 minute remains
        if (remaining <= 60 && !hasShownWarning) {
          NotificationManager.getInstance().show({ type: 'session-warning' })
          setHasShownWarning(true)
        }

        const duration = getDurationFormatFromSeconds(remaining)
        setTime(duration)
      } else {
        const duration = getDurationFormatFromSeconds(diff)
        setTime(duration)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [flowSession, hasShownWarning])

  useEffect(() => {
    // Listen for add-time events from notification
    const setupListener = async () => {
      const unlisten = await listen<{ action: string, minutes: number }>('add-time-event', (event) => {
        if (event.payload.action === 'add-time') {
          handleAddTime()
        }
      })

      return unlisten
    }

    const unlistenPromise = setupListener()

    return () => {
      unlistenPromise.then(unlisten => unlisten())
    }
  }, [handleAddTime])

  return (
    <>
      <div className="text-sm text-muted-foreground mb-2">{flowSession?.objective}</div>
      <div className="text-6xl font-bold mb-2 font-mono tracking-tight">
        {time}
      </div>
      {flowSession?.duration && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddTime}
          className="mt-2"
          disabled={isAddingTime || cooldown}
        >
          {isAddingTime ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding time...
            </>
          ) : cooldown ? (
            'Adding...'
          ) : (
            'Add 15 min'
          )}
        </Button>
      )}
    </>
  )
}

export const FlowPage = () => {
  useRustEvents()
  const navigate = useNavigate()
  const [flowSession, setFlowSession] = useState<FlowSession | null>(null)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [player, setPlayer] = useState<Spotify.Player | null>(null)
  const [deviceId, setDeviceId] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<{
    name: string
    artist: string
    duration_ms: number
    position_ms: number
  } | null>(null)
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(() => {
    const state = window.history.state?.usr
    return state?.selectedPlaylist || ''
  })
  const [isSpotifyAuthenticated, setIsSpotifyAuthenticated] = useState(false)
  const [playlistData, setPlaylistData] = useState<{
    playlists: { id: string; name: string }[];
    images: Record<string, string>;
  }>(() => {
    const saved = localStorage.getItem('playlistData')
    return saved ? JSON.parse(saved) : { playlists: [], images: {} }
  })
  const [isSpotifyInstalled, setIsSpotifyInstalled] = useState<boolean>(false)
  const [clickedButton, setClickedButton] = useState<'prev' | 'play' | 'next' | null>(null)

  // Show session start notification when page loads
  useEffect(() => {
    NotificationManager.getInstance().show({
      type: 'session-start'
    })
  }, [])

  useEffect(() => {
    const init = async () => {
      const flowSession = await FlowSessionApi.getInProgressFlowSession()
      if (!flowSession) {
        navigate('/start-flow')
      }
      setFlowSession(flowSession)
    }
    init()
  }, [])

  useEffect(() => {
    const handleSessionComplete = async () => {
      if (player && deviceId) {
        await player.pause()
        await SpotifyApiService.transferPlaybackToComputerDevice()
        player.disconnect() // Disconnect the Web Playback SDK player
        setIsPlaying(false)
        setCurrentTrack(null)
        setSelectedPlaylistId('')
      }
      handleEndSession()
    }
    window.addEventListener('flowSessionComplete', handleSessionComplete)

    return () => {
      window.removeEventListener('flowSessionComplete', handleSessionComplete)
    }
  }, [flowSession, player, deviceId])

  useEffect(() => {
    const initSpotify = async () => {
      try {
        const isAuthenticated = await SpotifyAuthService.isConnected()
        setIsSpotifyAuthenticated(isAuthenticated)

        if (!isAuthenticated) return

        await SpotifyApiService.initializePlayer()
        const newPlayer = await SpotifyApiService.createPlayer()

        newPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
          setDeviceId(device_id)
          const state = window.history.state?.usr
          if (state?.selectedPlaylist) {
            SpotifyApiService.startPlayback(state.selectedPlaylist, device_id)
          }
        })

        newPlayer.addListener('player_state_changed', (state: PlaybackState | null) => {
          if (!state || !state.track_window.current_track) return

          setIsPlaying(!state.paused)
          setCurrentTrack({
            name: state.track_window.current_track.name,
            artist: state.track_window.current_track.artists[0].name,
            duration_ms: state.duration,
            position_ms: state.position
          })
        })

        newPlayer.addListener('not_ready', () => {
          setTimeout(async () => {
            try {
              const isConnected = await SpotifyAuthService.isConnected()
              if (isConnected) {
                newPlayer.connect()
              }
            } catch (error) {
              console.error('Error reconnecting player:', error)
            }
          }, 2000)
        })

        setPlayer(newPlayer)
      } catch (error) {
        console.error('Failed to initialize Spotify player:', error)
      }
    }

    initSpotify()

    return () => {
      player?.disconnect()
    }
  }, [])

  useEffect(() => {
    const loadPlaylistData = async () => {
      if (!isSpotifyAuthenticated) return

      // Use cached data if available
      const cached = localStorage.getItem('playlistData')
      if (cached) {
        const parsedData = JSON.parse(cached)
        setPlaylistData(parsedData)
        return
      }

      // Load fresh data if no cache exists
      try {
        const playlists = await SpotifyApiService.getUserPlaylists()
        const images: Record<string, string> = {}

        for (const playlist of playlists) {
          const imageUrl = await SpotifyApiService.getPlaylistCoverImage(playlist.id)
          if (imageUrl) {
            images[playlist.id] = imageUrl
          }
        }

        const newPlaylistData = { playlists, images }
        setPlaylistData(newPlaylistData)
        localStorage.setItem('playlistData', JSON.stringify(newPlaylistData))
      } catch (error) {
        console.error('Error loading playlist data:', error)
      }
    }

    loadPlaylistData()
  }, [isSpotifyAuthenticated]) // Only run when Spotify authentication status changes

  useEffect(() => {
    if (!isSpotifyAuthenticated) return

    // Refresh token every 30 minutes to ensure uninterrupted playback
    const tokenRefreshInterval = setInterval(async () => {
      try {
        await SpotifyAuthService.refreshAccessToken()
      } catch (error) {
        console.error('Failed to refresh token in interval:', error)
      }
    }, 30 * 60 * 1000) // 30 minutes

    return () => clearInterval(tokenRefreshInterval)
  }, [isSpotifyAuthenticated])

  useEffect(() => {
    // Check if Spotify is installed when component mounts
    const checkSpotifyInstallation = async () => {
      try {
        const installed = await invoke<boolean>('detect_spotify')
        setIsSpotifyInstalled(installed)
      } catch (error) {
        console.error('Error detecting Spotify:', error)
        setIsSpotifyInstalled(false)
      }
    }

    checkSpotifyInstallation()
  }, [])

  const handleEndSession = async () => {
    if (!flowSession) return

    // Stop playback, transfer to computer device, and clear player state
    if (player && deviceId) {
      await player.pause()
      await SpotifyApiService.transferPlaybackToComputerDevice()
      player.disconnect() // Disconnect the Web Playback SDK player
      setIsPlaying(false)
      setCurrentTrack(null)
      setSelectedPlaylistId('')
    }

    await invoke('stop_blocking')
    await FlowSessionApi.endFlowSession(flowSession.id)
    setShowEndDialog(false)

    // Navigate to recap page with session data
    navigate('/flow-recap', {
      state: {
        sessionId: flowSession.id,
        startTime: flowSession.start,
        endTime: new Date().toISOString(),
        timeInFlow: '00:00',
        idleTime: '0h 34m',
        objective: flowSession.objective
      }
    })
  }

  const handlePlayPause = async () => {
    if (!player) return
    try {
      setClickedButton('play')
      if (isPlaying) {
        await player.pause()
      } else {
        await player.resume()
      }
    } catch (error) {
      console.error('Playback control error:', error)
    } finally {
      // Remove animation after 200ms
      setTimeout(() => setClickedButton(null), 200)
    }
  }

  const handleNext = async () => {
    if (!player) return
    try {
      setClickedButton('next')
      await player.nextTrack()
    } catch (error) {
      console.error('Next track error:', error)
    } finally {
      // Remove animation after 200ms
      setTimeout(() => setClickedButton(null), 200)
    }
  }

  const handlePrevious = async () => {
    if (!player) return
    try {
      setClickedButton('prev')
      await player.previousTrack()
    } catch (error) {
      console.error('Previous track error:', error)
    } finally {
      // Remove animation after 200ms
      setTimeout(() => setClickedButton(null), 200)
    }
  }

  const handlePlaylistChange = async (playlistId: string) => {
    if (!deviceId) return
    setSelectedPlaylistId(playlistId)

    // Save the selected playlist to local storage using the same key as StartFlowPage
    const playlist = playlistData.playlists.find(p => p.id === playlistId)
    if (playlist) {
      localStorage.setItem('lastPlaylist', playlistId)
    }

    await SpotifyApiService.startPlayback(playlistId, deviceId)
  }

  const MusicPlayer = () => (
    <div className="flex flex-col items-center space-y-6">
      <div className="text-center">
        {currentTrack && selectedPlaylistId ? (
          <>
            <h3 className="text-2xl font-semibold">{currentTrack.name}</h3>
            <p className="text-sm text-muted-foreground">{currentTrack.artist}</p>
          </>
        ) : (
          <h3 className="text-2xl font-semibold">
            {selectedPlaylistId ? 'Loading...' : 'Select a playlist'}
          </h3>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          className={clickedButton === 'prev' ? 'scale-90 transition-transform' : 'transition-transform'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
        </Button>
        <Button
          size="icon"
          className={`h-12 w-12 ${clickedButton === 'play' ? 'scale-90 transition-transform' : 'transition-transform'}`}
          onClick={handlePlayPause}
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className={clickedButton === 'next' ? 'scale-90 transition-transform' : 'transition-transform'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-end p-4">
        <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              End Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader className='gap-y-4'>
              <DialogTitle>End Focus Session</DialogTitle>
              <DialogDescription>
                Are you sure you want to end this focus session? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowEndDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleEndSession}>
                End Session
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <Timer flowSession={flowSession} />
        {isSpotifyAuthenticated && (
          <div className="w-full max-w-lg mx-auto px-4 mb-4 mt-12">
            <Card className="p-6">
              <CardContent className="space-y-12">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <SpotifyIcon />
                    <a
                      href="#"
                      onClick={async (e) => {
                        e.preventDefault()
                        if (isSpotifyInstalled) {
                          try {
                            const spotifyUri = selectedPlaylistId
                              ? `spotify:playlist:${selectedPlaylistId}`
                              : 'spotify:'
                            await invoke('plugin:shell|open', { path: spotifyUri })
                          } catch (error) {
                            console.error('Failed to open Spotify:', error)
                            // Fallback to web version if native app fails to open
                            const webUrl = selectedPlaylistId
                              ? `https://open.spotify.com/playlist/${selectedPlaylistId}`
                              : 'https://open.spotify.com'
                            await invoke('plugin:shell|open', { path: webUrl })
                          }
                        } else {
                          await invoke('plugin:shell|open', { path: 'https://open.spotify.com/download' })
                        }
                      }}
                      className="text-sm text-muted-foreground hover:underline cursor-pointer"
                    >
                      {isSpotifyInstalled ? 'Open Spotify' : 'Get Spotify Free'}
                    </a>
                  </div>
                  <Select value={selectedPlaylistId} onValueChange={handlePlaylistChange}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select playlist" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {playlistData.playlists.map(playlist => (
                        <SelectItem key={playlist.id} value={playlist.id}>
                          <div className="flex items-center">
                            {playlistData.images[playlist.id] ? (
                              <img
                                src={playlistData.images[playlist.id]}
                                alt={playlist.name}
                                className="h-6 w-6 rounded mr-2 object-cover"
                              />
                            ) : (
                              <Music className="h-4 w-4 mr-2" />
                            )}
                            {playlist.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <MusicPlayer />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
