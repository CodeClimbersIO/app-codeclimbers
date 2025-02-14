import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Music, Info, Plus, Minus } from 'lucide-react'
import { TopNav } from '@/components/TopNav'
import { LogoContainer } from '@/components/LogoContainer'
import { FlowSessionApi } from '../api/ebbApi/flowSessionApi'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSettings } from '../hooks/useSettings'
import { AppCategory } from '../lib/app-directory/apps-types'
import { TimeSelector } from '@/components/TimeSelector'
import { AppSelector } from '@/components/AppSelector'
import type { AppDefinition } from '@/lib/app-directory/apps-types'
import { SpotifyService } from '@/lib/integrations/spotify'
import { SpotifyIcon } from '@/components/icons/SpotifyIcon'
import { AppleMusicIcon } from '@/components/icons/AppleMusicIcon'

type SearchOption = AppDefinition | { type: 'category', category: AppCategory, count: number }

export const StartFlowPage = () => {
  const { userRole } = useSettings()
  const [objective, setObjective] = useState('')
  const [duration, setDuration] = useState<number | null>(() => {
    const saved = localStorage.getItem('lastDuration')
    return saved ? JSON.parse(saved) : null
  })
  const [selectedBlocks, setSelectedBlocks] = useState<SearchOption[]>(() => {
    const saved = localStorage.getItem('selectedBlocks')
    return saved ? JSON.parse(saved) : []
  })
  const [allowList, setAllowList] = useState(() => {
    const saved = localStorage.getItem('allowList')
    return saved ? JSON.parse(saved) : false
  })
  const [selectedPlaylist, setSelectedPlaylist] = useState(() => {
    const saved = localStorage.getItem('lastPlaylist')
    return saved || ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [musicService, setMusicService] = useState<{
    type: 'spotify' | 'apple' | null,
    connected: boolean,
    playlists: { id: string, name: string }[]
  }>({
    type: null,
    connected: false,
    playlists: []
  })
  const [spotifyProfile, setSpotifyProfile] = useState<{ email: string; display_name: string | null; product: string } | null>(null)
  const [showBlockingSection, setShowBlockingSection] = useState(false)
  const [showMusicSection, setShowMusicSection] = useState(() => {
    const hashParams = window.location.hash.replace('#', '')
    const searchParams = new URLSearchParams(window.location.search || hashParams.substring(hashParams.indexOf('?')))
    return searchParams.get('expandMusic') === 'true'
  })
  const navigate = useNavigate()

  useEffect(() => {
    localStorage.setItem('selectedBlocks', JSON.stringify(selectedBlocks))
  }, [selectedBlocks])

  useEffect(() => {
    localStorage.setItem('lastDuration', JSON.stringify(duration))
  }, [duration])

  useEffect(() => {
    localStorage.setItem('allowList', JSON.stringify(allowList))
  }, [allowList])

  useEffect(() => {
    localStorage.setItem('lastPlaylist', selectedPlaylist)
  }, [selectedPlaylist])

  // Combine the two separate useEffects into one that handles both initial load
  // and auth callback
  useEffect(() => {
    const handleSpotifyCallback = async () => {
      const hashParams = window.location.hash.replace('#', '')
      const searchParams = new URLSearchParams(window.location.search || hashParams.substring(hashParams.indexOf('?')))
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      
      if (code && state) {
        try {
          setIsLoading(true)
          await SpotifyService.handleCallback(code, state)
          // Clear URL parameters but keep expandMusic=true
          window.history.replaceState({}, '', '/start-flow?expandMusic=true')
          // Force a full page refresh to get updated Spotify state
          window.location.reload()
          return
        } catch (error) {
          console.error('Error handling Spotify callback:', error)
          setIsLoading(false)
        }
      }
      
      // Always check connection status after handling callback or on initial load
      await checkSpotifyConnection()
    }

    handleSpotifyCallback()
  }, []) // Run once on mount

  const checkSpotifyConnection = async () => {
    try {
      const isConnected = await SpotifyService.isConnected()
      
      if (isConnected) {
        const [profile, playlists] = await Promise.all([
          SpotifyService.getUserProfile(),
          SpotifyService.getUserPlaylists()
        ])
        
        if (profile) {
          setSpotifyProfile(profile)
          setMusicService({
            type: 'spotify',
            connected: true,
            playlists: playlists
          })
        }
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error('Error checking Spotify connection:', error)
      setIsLoading(false)
    }
  }

  // Clear the URL parameter after initial load
  useEffect(() => {
    const hashParams = window.location.hash.replace('#', '')
    const searchParams = new URLSearchParams(window.location.search || hashParams.substring(hashParams.indexOf('?')))
    if (searchParams.get('expandMusic')) {
      window.history.replaceState({}, '', '#/start-flow')
    }
  }, [])

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && objective) {
        handleBegin()
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [objective]) // Re-run when objective changes

  const getPlaceholderByRole = () => {
    switch (userRole) {
      case 'developer':
        return '💻 Build new feature...'
      case 'designer':
        return '🎨 Design landing page...'
      case 'creator':
        return '🎥 Create new content...'
      default:
        return '💡 Enter your goal...'
    }
  }

  const handleBegin = async () => {
    if (!objective) return

    try {
      const sessionId = await FlowSessionApi.startFlowSession(objective, duration || undefined)

      if (!sessionId) {
        console.error('No session ID returned from API')
        return
      }

      navigate('/breathing-exercise', {
        state: {
          startTime: Date.now(),
          objective,
          sessionId,
          duration: duration || undefined,
          blocks: allowList ? 'all' : selectedBlocks,
          allowList,
          playlist: selectedPlaylist ? {
            id: selectedPlaylist,
            service: musicService.type
          } : null
        }
      })
    } catch (error) {
      console.error('Failed to start flow session:', error)
    }
  }

  const handleAppSelect = (option: SearchOption) => {
    setSelectedBlocks((prev: SearchOption[]) => {
      const newBlocks = [...prev, option]
      localStorage.setItem('selectedBlocks', JSON.stringify(newBlocks))
      return newBlocks
    })
  }

  const handleAppRemove = (option: SearchOption) => {
    setSelectedBlocks((prev: SearchOption[]) => {
      const newBlocks = prev.filter(app => {
        if ('category' in option && 'category' in app && option.type === 'category' && app.type === 'category') {
          return app.category !== option.category
        }
        if ('type' in option && 'type' in app) {
          if (option.type === 'application' && app.type === 'application') {
            return app.name !== option.name
          }
          if (option.type === 'website' && app.type === 'website') {
            return app.websiteUrl !== option.websiteUrl
          }
        }
        return true
      })
      localStorage.setItem('selectedBlocks', JSON.stringify(newBlocks))
      return newBlocks
    })
  }

  const CollapsibleSectionHeader = ({
    title,
    isExpanded,
    onToggle,
    type
  }: {
    title: string,
    isExpanded: boolean,
    onToggle: () => void,
    type: 'blocking' | 'music'
  }) => (
    <div
      className="flex items-center justify-between cursor-pointer"
      onClick={onToggle}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex items-center gap-2">
        {!isExpanded && (
          <span className="text-sm text-muted-foreground">
            {type === 'music'
              ? musicService.playlists.find(p => p.id === selectedPlaylist)?.name || 'No playlist selected'
              : 'Applying last used'
            }
          </span>
        )}
        {isExpanded ? (
          <Minus className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Plus className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
  )

  const MusicSection = () => (
    <div>
      <CollapsibleSectionHeader
        title="Music"
        isExpanded={showMusicSection}
        onToggle={() => setShowMusicSection(!showMusicSection)}
        type="music"
      />
      {showMusicSection && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-2">
            {!musicService.connected && (
              <>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => SpotifyService.connect()}
                  disabled={isLoading}
                >
                  <SpotifyIcon />
                  <span className="ml-2">Connect Spotify</span>
                </Button>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled={true}
                        >
                          <AppleMusicIcon />
                          <span className="ml-2">Coming Soon</span>
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Apple Music integration coming soon</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}

            {musicService.connected && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  {musicService.type === 'spotify' ? <SpotifyIcon /> : <AppleMusicIcon />}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate('/settings')}
                      className="text-sm text-muted-foreground hover:underline focus:outline-none"
                    >
                      Connected
                    </button>
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                </div>

                {spotifyProfile?.product === 'premium' ? (
                  <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a playlist" />
                    </SelectTrigger>
                    <SelectContent>
                      {musicService.playlists.map(playlist => (
                        <SelectItem key={playlist.id} value={playlist.id}>
                          <div className="flex items-center">
                            <Music className="h-4 w-4 mr-2" />
                            {playlist.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <button
                    onClick={() => navigate('/settings')}
                    className="text-sm text-destructive hover:underline focus:outline-none"
                  >
                    Error: Spotify Premium required
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-screen">
      <div className="flex">
        <LogoContainer />
        <TopNav variant="modal" />
      </div>
      <div className="flex-1 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Card className="w-[400px]">
          <CardContent className="pt-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Goal</h2>
              <Input
                placeholder={getPlaceholderByRole()}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                maxLength={50}
                className="w-full"
              />
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Session Duration</h2>
              <TimeSelector
                value={duration}
                onChange={setDuration}
              />
            </div>

            <div>
              <CollapsibleSectionHeader
                title="Blocking"
                isExpanded={showBlockingSection}
                onToggle={() => setShowBlockingSection(!showBlockingSection)}
                type="blocking"
              />
              {showBlockingSection && (
                <div className="mt-4 space-y-4">
                  <AppSelector
                    placeholder="Search apps & websites to block..."
                    emptyText="No apps or websites found."
                    selectedApps={selectedBlocks}
                    onAppSelect={handleAppSelect}
                    onAppRemove={handleAppRemove}
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={allowList}
                        onCheckedChange={(checked) => {
                          setAllowList(checked)
                        }}
                      />
                      <span className="text-sm text-muted-foreground">Allow List</span>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Only allow what's on this list and block everything else</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              )}
            </div>

            <MusicSection />

            <Button
              className="w-full"
              onClick={handleBegin}
              disabled={!objective}
            >
              Start Focus Session
              <kbd className="ml-2 rounded bg-violet-900 px-1.5 font-mono text-xs">
                ↵
              </kbd>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
