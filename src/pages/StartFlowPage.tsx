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

type SearchOption = AppDefinition | { type: 'category', category: AppCategory, count: number }

export const StartFlowPage = () => {
  const { userRole } = useSettings()
  const [objective, setObjective] = useState('')
  const [duration, setDuration] = useState<number | null>(null)
  const [selectedBlocks, setSelectedBlocks] = useState<SearchOption[]>(() => {
    const saved = localStorage.getItem('selectedBlocks')
    return saved ? JSON.parse(saved) : []
  })
  const [selectedPlaylist, setSelectedPlaylist] = useState('')
  const musicService = {
    type: 'spotify' as const,
    connected: true,
    playlists: [
      { id: '1', name: 'Focus Flow' },
      { id: '2', name: 'Deep Work' },
      { id: '3', name: 'Coding Mode' },
    ]
  }
  const [allowList, setAllowList] = useState(false)
  const [showBlockingSection, setShowBlockingSection] = useState(false)
  const [showMusicSection, setShowMusicSection] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    localStorage.setItem('selectedBlocks', JSON.stringify(selectedBlocks))
  }, [selectedBlocks])

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
              ? `Playing ${musicService.type === 'spotify' ? 'Spotify' : 'Apple Music'}`
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

            <div>
              <CollapsibleSectionHeader
                title="Music"
                isExpanded={showMusicSection}
                onToggle={() => setShowMusicSection(!showMusicSection)}
                type="music"
              />
              {showMusicSection && (
                <>
                  <div className="flex items-center gap-2 mt-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`h-2 w-2 rounded-full ${musicService.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-muted-foreground">
                        {musicService.type === 'spotify' ? 'Spotify' : 'Apple Music'}
                        {musicService.connected ? ' Connected' : ' Disconnected'}
                      </span>
                    </div>
                  </div>

                  {musicService.connected ? (
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
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {/* Handle connection */ }}
                    >
                      Connect {musicService.type === 'spotify' ? 'Spotify' : 'Apple Music'}
                    </Button>
                  )}
                </>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleBegin}
              disabled={!objective}
            >
              Start Focus Session
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
