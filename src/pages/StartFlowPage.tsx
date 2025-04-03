import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TopNav } from '@/components/TopNav'
import { FlowSessionApi } from '../api/ebbApi/flowSessionApi'
import { TimeSelector } from '@/components/TimeSelector'
import { WorkflowSelector } from '@/components/WorkflowSelector'
import { WorkflowApi, type Workflow } from '@/api/ebbApi/workflowApi'
import { invoke } from '@tauri-apps/api/core'
import { DateTime, Duration } from 'luxon'
import { startFlowTimer } from '../lib/tray'
import { getDurationFromDefault, useFlowTimer } from '../lib/stores/flowTimer'
import { MusicSelector } from '@/components/MusicSelector'
import { AppSelector, type SearchOption } from '@/components/AppSelector'
import { BlockingPreferenceApi } from '../api/ebbApi/blockingPreferenceApi'
import { App } from '../db/monitor/appRepo'
import { TypeOutline } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export const StartFlowPage = () => {
  const { duration, setDuration } = useFlowTimer()
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null)
  const [selectedApps, setSelectedApps] = useState<SearchOption[]>([])
  const [isAllowList, setIsAllowList] = useState(false)
  const [hasBreathing, setHasBreathing] = useState(true)
  const [hasTypewriter, setHasTypewriter] = useState(false)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        const loadedWorkflows = await WorkflowApi.getWorkflows()
        setWorkflows(loadedWorkflows)
        
        if (loadedWorkflows.length > 0) {
          const mostRecentWorkflow = loadedWorkflows.reduce((prev, current) => {
            return (prev.lastSelected || 0) > (current.lastSelected || 0) ? prev : current
          }, loadedWorkflows[0])

          setSelectedWorkflowId(mostRecentWorkflow.id || null)
          setSelectedWorkflow(mostRecentWorkflow)
          setDuration(getDurationFromDefault(mostRecentWorkflow.settings.defaultDuration))
          setSelectedPlaylist(mostRecentWorkflow.selectedPlaylist || null)
          setSelectedApps(mostRecentWorkflow.selectedApps || [])
          setIsAllowList(mostRecentWorkflow.settings.isAllowList || false)
          setHasBreathing(mostRecentWorkflow.settings.hasBreathing ?? true)
          setHasTypewriter(mostRecentWorkflow.settings.hasTypewriter ?? false)
          setDifficulty(mostRecentWorkflow.settings.difficulty || null)
        }
      } catch (error) {
        console.error('Failed to load workflows:', error)
      }
    }

    loadWorkflows()
  }, [setDuration])

  const saveChanges = useCallback(async () => {
    if (!selectedWorkflow?.id) return

    const updatedWorkflow: Workflow = {
      ...selectedWorkflow,
      selectedApps,
      selectedPlaylist,
      selectedPlaylistName: selectedWorkflow.selectedPlaylistName,
      settings: {
        ...selectedWorkflow.settings,
        defaultDuration: duration?.as('minutes') ?? null,
        isAllowList,
        hasBreathing,
        hasTypewriter,
        hasMusic: true,
        difficulty
      }
    }

    try {
      await WorkflowApi.saveWorkflow(updatedWorkflow)
    } catch (error) {
      console.error('Failed to save workflow changes:', error)
    }
  }, [duration, selectedPlaylist, selectedApps, isAllowList, selectedWorkflow, hasBreathing, hasTypewriter, difficulty])

  useEffect(() => {
    if (selectedWorkflow?.id) {
      const timeoutId = setTimeout(() => {
        saveChanges()
      }, 150)
      return () => clearTimeout(timeoutId)
    }
  }, [selectedWorkflow, duration, selectedPlaylist, selectedApps, isAllowList, hasBreathing, hasTypewriter, saveChanges])

  const handleWorkflowSelect = async (workflowId: string) => {
    try {
      setSelectedWorkflowId(workflowId)
      
      const workflow = await WorkflowApi.getWorkflowById(workflowId)
      if (workflow) {
        setSelectedWorkflow(workflow)
        setDuration(getDurationFromDefault(workflow.settings.defaultDuration))
        setSelectedPlaylist(workflow.selectedPlaylist || null)
        setSelectedApps(workflow.selectedApps || [])
        setIsAllowList(workflow.settings.isAllowList || false)
        setHasBreathing(workflow.settings.hasBreathing ?? true)
        setHasTypewriter(workflow.settings.hasTypewriter ?? false)
        setDifficulty(workflow.settings.difficulty || null)
      }
    } catch (error) {
      console.error('Failed to select workflow:', error)
    }
  }

  useEffect(() => {
    if (selectedWorkflowId) {
      const refreshWorkflow = async () => {
        try {
          const workflow = await WorkflowApi.getWorkflowById(selectedWorkflowId)
          if (workflow) {
            setSelectedWorkflow(workflow)
          }
        } catch (error) {
          console.error('Failed to refresh workflow:', error)
        }
      }
      refreshWorkflow()
    }
  }, [selectedWorkflowId])

  const handleBegin = async () => {
    try {
      const workflowId = selectedWorkflowId
      const workflowName = selectedWorkflow?.name || 'Focus Session'

      // If this is the first session (no workflows), create one from current settings
      if (workflows.length === 0) {
        const newWorkflow: Workflow = {
          name: 'New Preset',
          selectedApps,
          selectedPlaylist,
          selectedPlaylistName: null,
          lastSelected: Date.now(),
          settings: {
            defaultDuration: duration?.as('minutes') ?? null,
            isAllowList,
            hasBreathing,
            hasTypewriter,
            hasMusic: true,
            difficulty
          }
        }

        try {
          const savedWorkflow = await WorkflowApi.saveWorkflow(newWorkflow)
          setWorkflows([savedWorkflow])
          setSelectedWorkflowId(savedWorkflow.id || null)
          setSelectedWorkflow(savedWorkflow)
        } catch (error) {
          console.error('Failed to save first workflow:', error)
        }
      }

      const blockedApps = workflowId ? 
        await BlockingPreferenceApi.getWorkflowBlockedApps(workflowId) :
        []
      
      const blockingApps = blockedApps.map((app: App) => ({
        external_id: app.app_external_id,
        is_browser: app.is_browser === 1
      }))
      const isBlockList = !isAllowList

      if (workflowId) {
        await WorkflowApi.updateLastSelected(workflowId)
      }

      const sessionId = await FlowSessionApi.startFlowSession(
        workflowName,
        duration ? duration.as('minutes') : undefined
      )

      if (!sessionId) {
        throw new Error('No session ID returned from API')
      }

      await startFlowTimer(DateTime.now())

      const sessionState = {
        startTime: Date.now(),
        objective: workflowName,
        sessionId,
        duration: duration ? duration.as('minutes') : undefined,
        workflowId,
        hasBreathing,
        hasTypewriter,
        hasMusic: true,
        selectedPlaylist,
        selectedPlaylistName: selectedWorkflow?.selectedPlaylistName,
        difficulty
      }

      await invoke('start_blocking', { blockingApps, isBlockList })

      if (!hasBreathing) {
        navigate('/session', { state: sessionState })
      } else {
        navigate('/breathing-exercise', { state: sessionState })
      }
    } catch (error) {
      console.error('Failed to start flow session:', error)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleBegin()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleBegin])

  return (
    <div className="flex flex-col h-screen">
      <TopNav variant="modal" />
      <div className="flex-1 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Card className="w-[420px]">
          <CardContent className="pt-6 space-y-6">
            {workflows.length > 0 && (
              <motion.div
                layout
                transition={{ 
                  type: 'spring',
                  stiffness: 300,
                  damping: 30
                }}
              >
                <WorkflowSelector 
                  selectedId={selectedWorkflowId} 
                  onSelect={handleWorkflowSelect}
                />
              </motion.div>
            )}

            <div>
              <AppSelector
                selectedApps={selectedApps}
                onAppSelect={(app) => setSelectedApps([...selectedApps, app])}
                onAppRemove={(app) => setSelectedApps(selectedApps.filter(a => 
                  a.type === 'app' && app.type === 'app' 
                    ? a.app.app_external_id !== app.app.app_external_id
                    : a !== app
                ))}
                isAllowList={isAllowList}
                onIsAllowListChange={setIsAllowList}
                difficulty={difficulty}
                onDifficultyChange={setDifficulty}
              />
            </div>

            <div>
              <MusicSelector
                selectedPlaylist={selectedPlaylist}
                onPlaylistSelect={(playlist) => {
                  setSelectedPlaylist(playlist.id)
                }}
                onConnectClick={() => {
                  navigate('/settings#music-integrations')
                }}
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <TimeSelector
                  value={duration?.as('minutes') ?? null}
                  onChange={(value) => setDuration(value ? Duration.fromObject({ minutes: value }) : null)}
                />
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground opacity-50 cursor-not-allowed"
                          disabled
                        >
                          <TypeOutline className="h-4 w-4" />
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Typewriter Mode coming soon</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleBegin}
            >
              Start Focus
              <div className="ml-2 flex items-center gap-1">
                <kbd className="rounded bg-violet-900 px-1.5 font-mono text-sm">⌘</kbd>
                <kbd className="rounded bg-violet-900 px-1.5 font-mono text-sm">↵</kbd>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
