import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FlowSession } from '../db/flowSession'
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
import { Music } from 'lucide-react'
import { SpotifyService } from '@/lib/integrations/spotify'
import { SpotifyIcon } from '@/components/icons/SpotifyIcon'

const getDurationFormatFromSeconds = (seconds: number) => {
  const duration = Duration.fromMillis(seconds * 1000)
  const format = duration.as('minutes') >= 60 ? 'hh:mm:ss' : 'mm:ss'
  return duration.toFormat(format)
}

export const FlowPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [time, setTime] = useState<string>('00:00')
  const [flowSession, setFlowSession] = useState<FlowSession | null>(null)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [player, setPlayer] = useState<Spotify.Player | null>(null)
  const [deviceId, setDeviceId] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<{
    name: string;
    artist: string;
    duration_ms: number;
    position_ms: number;
  } | null>(null)
  const [playlists, setPlaylists] = useState<{ id: string; name: string; }[]>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('')

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
    if (!flowSession) return

    const updateTimer = () => {
      const now = DateTime.now()
      const nowAsSeconds = now.toSeconds()
      const startTime = DateTime.fromISO(flowSession.start).toSeconds()

      const diff = nowAsSeconds - startTime

      // If duration is set (in minutes), do countdown
      if (flowSession.duration) {
        const remaining = (flowSession.duration) - diff
        if (remaining <= 0) {
          handleEndSession()
          return
        }

        const duration = getDurationFormatFromSeconds(remaining)
        setTime(duration)
      } else {
        // Count up if no duration set
        const duration = getDurationFormatFromSeconds(diff)
        setTime(duration)
      }

    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [flowSession])

  useEffect(() => {
    const initSpotify = async () => {
      try {
        await SpotifyService.initializePlayer()
        const newPlayer = await SpotifyService.createPlayer()
        
        newPlayer.addListener('ready', ({ device_id }) => {
          setDeviceId(device_id)
          // Start playback if playlist was selected
          const playlist = location.state?.playlist
          if (playlist?.id) {
            SpotifyService.startPlayback(playlist.id, device_id)
          }
        })

        newPlayer.addListener('player_state_changed', (state) => {
          if (!state) return
          
          setIsPlaying(!state.paused)
          setCurrentTrack({
            name: state.track_window.current_track.name,
            artist: state.track_window.current_track.artists[0].name,
            duration_ms: state.duration,
            position_ms: state.position
          })
        })

        setPlayer(newPlayer)
      } catch (error) {
        console.error('Failed to initialize Spotify player:', error)
      }
    }

    initSpotify()

    // Cleanup
    return () => {
      player?.disconnect()
    }
  }, [])

  useEffect(() => {
    const fetchPlaylists = async () => {
      const userPlaylists = await SpotifyService.getUserPlaylists()
      setPlaylists(userPlaylists)
      // Set initial playlist from location state
      const initialPlaylist = location.state?.playlist?.id
      if (initialPlaylist) {
        setSelectedPlaylistId(initialPlaylist)
      }
    }
    fetchPlaylists()
  }, [])

  const handleEndSession = async () => {
    if (!flowSession) return
    
    // Stop playback if player exists
    if (player && deviceId) {
      await SpotifyService.controlPlayback('pause', deviceId)
    }
    
    await FlowSessionApi.endFlowSession(flowSession.id)
    setShowEndDialog(false)

    // Navigate to recap page with session data
    navigate('/flow-recap', {
      state: {
        sessionId: flowSession.id,
        startTime: flowSession.start,
        endTime: new Date().toISOString(),
        timeInFlow: time,
        idleTime: '0h 34m',
        objective: flowSession.objective
      }
    })
  }

  const handlePlayPause = async () => {
    if (!player || !deviceId) return
    await SpotifyService.controlPlayback(isPlaying ? 'pause' : 'play', deviceId)
  }

  const handleNext = async () => {
    if (!player || !deviceId) return
    await SpotifyService.controlPlayback('next', deviceId)
  }

  const handlePrevious = async () => {
    if (!player || !deviceId) return
    await SpotifyService.controlPlayback('previous', deviceId)
  }

  const handlePlaylistChange = async (playlistId: string) => {
    if (!deviceId) return
    setSelectedPlaylistId(playlistId)
    await SpotifyService.startPlayback(playlistId, deviceId)
  }

  const MusicPlayer = () => (
    <div className="flex flex-col items-center space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-semibold">{currentTrack?.name || 'Loading...'}</h3>
        <p className="text-sm text-muted-foreground">{currentTrack?.artist}</p>
      </div>

      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={handlePrevious}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
        </Button>
        <Button size="icon" className="h-12 w-12" onClick={handlePlayPause}>
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={handleNext}>
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
        <div className="text-sm text-muted-foreground mb-2">{flowSession?.objective}</div>
        <div className="text-6xl font-bold mb-2">
          {time}
        </div>
        <div className="w-full max-w-xl mx-auto px-4 mb-4 mt-12">
          <Card className="p-6">
            <CardContent className="space-y-12">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <SpotifyIcon />
                  <span className="text-sm text-muted-foreground">Connected</span>
                </div>
                <Select value={selectedPlaylistId} onValueChange={handlePlaylistChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select playlist" />
                  </SelectTrigger>
                  <SelectContent>
                    {playlists.map(playlist => (
                      <SelectItem key={playlist.id} value={playlist.id}>
                        <div className="flex items-center">
                          <Music className="h-4 w-4 mr-2" />
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
      </div>
    </div>
  )
}
