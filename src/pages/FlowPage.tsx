import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { useMusicService } from '../hooks/useMusicService'

const getDurationFormatFromSeconds = (seconds: number) => {
  const duration = Duration.fromMillis(seconds * 1000)
  const format = duration.as('minutes') >= 60 ? 'hh:mm:ss' : 'mm:ss'
  return duration.toFormat(format)
}

export const FlowPage = () => {
  const navigate = useNavigate()
  const [time, setTime] = useState<string>('00:00')
  const [flowSession, setFlowSession] = useState<FlowSession | null>(null)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [player, setPlayer] = useState<any>(null)
  const [playbackState, setPlaybackState] = useState<any>(null)
  const { musicService } = useMusicService()

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
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true

    document.body.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Flow App Player',
        getOAuthToken: cb => { cb(localStorage.getItem('spotify_token')) }
      })

      player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id)
      })

      player.addListener('player_state_changed', state => {
        setPlaybackState(state)
      })

      player.connect()
      setPlayer(player)
    }

    return () => {
      document.body.removeChild(script)
      if (player) {
        player.disconnect()
      }
    }
  }, [])

  const handleEndSession = async () => {
    if (!flowSession) return
    await FlowSessionApi.endFlowSession(flowSession.id)
    setShowEndDialog(false)

    // Navigate to recap page with session data
    navigate('/flow-recap', {
      state: {
        sessionId: flowSession.id,
        startTime: flowSession.start,
        endTime: new Date().toISOString(),
        timeInFlow: time,
        idleTime: '0h 34m', // You'll need to calculate this properly
        objective: flowSession.objective
      }
    })
  }

  const handlePlayPause = () => {
    player.togglePlay()
  }

  const handlePrevious = () => {
    player.previousTrack()
  }

  const handleNext = () => {
    player.nextTrack()
  }

  const renderMusicPlayer = () => {
    if (!playbackState) return null

    const { track_window: { current_track }, paused } = playbackState

    return (
      <div className="flex flex-col items-center space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-semibold">{current_track.name}</h3>
          <p className="text-sm text-muted-foreground">{current_track.artists[0].name}</p>
        </div>
        
        <div className="w-full space-y-2">
          <div className="relative w-full h-1 bg-secondary rounded-full overflow-hidden">
            <div className="absolute h-full w-1/3 bg-primary rounded-full" />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1:23</span>
            <span>3:45</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={handlePrevious}>
            {/* Previous button SVG */}
          </Button>
          <Button size="icon" className="h-12 w-12" onClick={handlePlayPause}>
            {/* Play/Pause button SVG based on paused state */}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNext}>
            {/* Next button SVG */}
          </Button>
        </div>
      </div>
    )
  }

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
        <div className="w-full max-w-2xl mx-auto px-4 mb-4 mt-12">
          <Card className="p-6">
            <CardContent className="space-y-12">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">
                    Connected to Spotify
                  </span>
                </div>
                <Select defaultValue="playlist1">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select playlist" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="playlist1">
                      <div className="flex items-center">
                        <Music className="h-4 w-4 mr-2" />
                        Deep Focus Playlist
                      </div>
                    </SelectItem>
                    <SelectItem value="playlist2">
                      <div className="flex items-center">
                        <Music className="h-4 w-4 mr-2" />
                        Coding Mode
                      </div>
                    </SelectItem>
                    <SelectItem value="playlist3">
                      <div className="flex items-center">
                        <Music className="h-4 w-4 mr-2" />
                        Flow State
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {renderMusicPlayer()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
