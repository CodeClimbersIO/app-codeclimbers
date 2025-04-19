import { Pencil, Trash2, Settings } from 'lucide-react'
import { motion } from 'motion/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from './ui/context-menu'
import { useState, useEffect, useRef } from 'react'
import { Workflow, WorkflowApi } from '../api/ebbApi/workflowApi'
import { Badge } from './ui/badge'
import { cn } from '@/lib/utils/tailwind.util'
import { Button } from './ui/button'
import { Switch } from '@/components/ui/switch'
import { error as logError } from '@tauri-apps/plugin-log'
import { PaywallDialog } from '@/components/PaywallDialog'
import { usePermissions } from '@/hooks/usePermissions'

interface WorkflowSelectorProps {
  selectedId: string | null
  onSelect: (workflowId: string) => void
  onSettingsChange?: (workflowId: string, newSettings: Workflow['settings']) => void
}

interface WorkflowBadgeProps { 
  workflow: Workflow
  isSelected: boolean
  onClick: () => void
  onRename?: (newName: string) => void
  onDelete?: () => void
  onUpdateSettings?: (settings: Workflow['settings']) => void
  className?: string
  'data-workflow-id'?: string
}

function WorkflowBadge({ 
  workflow, 
  isSelected,
  onClick,
  onRename,
  onDelete,
  onUpdateSettings,
  className,
  ...props
}: WorkflowBadgeProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showAdvancedDialog, setShowAdvancedDialog] = useState(false)
  const [hasBreathing, setHasBreathing] = useState(workflow.settings.hasBreathing ?? true)
  const [hasMusic, setHasMusic] = useState(workflow.settings.hasMusic ?? true)
  const badgeRef = useRef<HTMLDivElement>(null)
  const editableRef = useRef<HTMLSpanElement>(null)

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsEditing(true)
    setTimeout(() => {
      if (editableRef.current) {
        editableRef.current.focus()
        const range = document.createRange()
        range.selectNodeContents(editableRef.current)
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }
    }, 0)
  }

  const handleNameSave = () => {
    const newName = editableRef.current?.textContent || ''
    if (newName.trim().length === 0) {
      if (editableRef.current) {
        editableRef.current.textContent = workflow.name
      }
      setIsEditing(false)
      return
    }

    if (newName !== workflow.name && onRename) {
      onRename(newName)
    }
    
    setIsEditing(false)
  }

  const handleDelete = () => {
    setShowDeleteDialog(false)
    onDelete?.()
  }

  const handleBreathingChange = (checked: boolean) => {
    setHasBreathing(checked)
    if (onUpdateSettings) {
      onUpdateSettings({
        ...workflow.settings,
        hasBreathing: checked
      })
    }
  }

  const handleMusicChange = (checked: boolean) => {
    setHasMusic(checked)
    if (onUpdateSettings) {
      onUpdateSettings({
        ...workflow.settings,
        hasMusic: checked
      })
    }
  }

  useEffect(() => {
    if (isEditing && editableRef.current) {
      editableRef.current.focus()
      const range = document.createRange()
      range.selectNodeContents(editableRef.current)
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }, [isEditing])

  return (
    <motion.div layout>
      <ContextMenu modal={false}>
        <ContextMenuTrigger>
          <div ref={badgeRef}>
            <Badge
              variant={isSelected ? 'default' : 'secondary'}
              className={cn(
                'cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis px-4',
                isEditing && 'shadow-[inset_0_0_0_2px] shadow-primary bg-muted/50 hover:bg-muted/50',
                className
              )}
              onClick={isEditing ? undefined : onClick}
              onDoubleClick={handleDoubleClick}
              {...props}
            >
              <span
                ref={editableRef}
                contentEditable={isEditing}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (isEditing) {
                    e.stopPropagation()
                  }
                  
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleNameSave()
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    if (editableRef.current) {
                      editableRef.current.textContent = workflow.name
                    }
                    setIsEditing(false)
                  } else if (editableRef.current && editableRef.current.textContent && 
                           editableRef.current.textContent.length >= 15 && 
                           e.key !== 'Backspace' && e.key !== 'Delete' && 
                           !e.metaKey && !e.ctrlKey) {
                    e.preventDefault()
                  }
                }}
                suppressContentEditableWarning
                className={cn(
                  'outline-none',
                  isEditing && 'min-w-[1px] caret-primary focus:cursor-text'
                )}
              >
                {workflow.name}
              </span>
            </Badge>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => {
            setIsEditing(true)
          }} className="cursor-pointer">
            <Pencil className="mr-2 h-4 w-4" />
            <span>Rename</span>
          </ContextMenuItem>
          {workflow.id && (
            <>
              <ContextMenuItem 
                onClick={() => setShowAdvancedDialog(true)} 
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Advanced</span>
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem 
                onClick={() => setShowDeleteDialog(true)} 
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{workflow.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdvancedDialog} onOpenChange={setShowAdvancedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Advanced Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="h-px bg-border" />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span>Breathing Exercise</span>
                  <p className="text-sm text-muted-foreground">
                    Start each session with a 10 sec breathing exercise
                  </p>
                </div>
                <Switch
                  checked={hasBreathing}
                  onCheckedChange={handleBreathingChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span>Enable Music</span>
                  <p className="text-sm text-muted-foreground">
                    Play Spotify or Apple Music during the session
                  </p>
                </div>
                <Switch
                  checked={hasMusic}
                  onCheckedChange={handleMusicChange}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

export function WorkflowSelector({ selectedId, onSelect, onSettingsChange }: WorkflowSelectorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [showLeftMask, setShowLeftMask] = useState(false)
  const { canUseMultipleProfiles } = usePermissions()

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setShowLeftMask(scrollContainerRef.current.scrollLeft > 0)
    }
  }

  useEffect(() => {
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const currentIndex = workflows.findIndex(w => w.id === selectedId)
        if (currentIndex === -1) return

        let newIndex
        if (event.key === 'ArrowLeft') {
          newIndex = Math.max(0, currentIndex - 1)
        } else {
          newIndex = Math.min(workflows.length - 1, currentIndex + 1)
        }

        const newWorkflow = workflows[newIndex]
        if (newWorkflow?.id) {
          onSelect(newWorkflow.id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [workflows, selectedId, onSelect])

  useEffect(() => {
    if (!selectedId || !scrollContainerRef.current) return
    
    const container = scrollContainerRef.current
    const selectedElement = container.querySelector(`[data-workflow-id="${selectedId}"]`) as HTMLElement
    
    if (!selectedElement) return
    
    const containerRect = container.getBoundingClientRect()
    const elementRect = selectedElement.getBoundingClientRect()
    
    const isFullyVisible = 
      elementRect.left >= containerRect.left && 
      elementRect.right <= containerRect.right
    
    if (isFullyVisible) return
    
    const containerCenter = containerRect.left + containerRect.width / 2
    const elementCenter = elementRect.left + elementRect.width / 2
    const scrollDistance = elementCenter - containerCenter
    
    container.scrollBy({
      left: scrollDistance,
      behavior: 'smooth'
    })
  }, [selectedId])

  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        const loadedWorkflows = await WorkflowApi.getWorkflows()
        const sortedWorkflows = [...loadedWorkflows].sort((a, b) => 
          (b.lastSelected || 0) - (a.lastSelected || 0)
        )
        setWorkflows(sortedWorkflows)
        
        if (!selectedId && sortedWorkflows.length > 0) {
          if (sortedWorkflows[0].id) {
            onSelect(sortedWorkflows[0].id)
          }
        }
      } catch (error) {
        logError(`Failed to load workflows: ${error}`)
      }
    }
    
    loadWorkflows()
  }, [selectedId, onSelect])

  const handleSelect = async (workflowId: string) => {
    if (workflowId === 'new') {
      if (workflows.length >= 1 && !canUseMultipleProfiles) {
        return
      }

      const newWorkflow: Workflow = {
        name: 'New Profile',
        selectedApps: [],
        selectedPlaylist: null,
        lastSelected: Date.now(),
        settings: {
          typewriterMode: false,
          hasBreathing: true,
          hasMusic: true,
          isAllowList: false,
          defaultDuration: null,
          difficulty: 'medium',
        }
      }
      
      try {
        const savedWorkflow = await WorkflowApi.saveWorkflow(newWorkflow)
        const updatedWorkflows = await WorkflowApi.getWorkflows()
        setWorkflows(updatedWorkflows)
        if (savedWorkflow.id) {
          onSelect(savedWorkflow.id)
        }
      } catch (error) {
        logError(`Failed to create new workflow: ${error}`)
      }
    } else {
      onSelect(workflowId)
    }
  }

  const handleRename = async (workflow: Workflow, newName: string) => {
    if (!workflow.id || newName.trim().length === 0 || newName === workflow.name) return

    try {
      await WorkflowApi.renameWorkflow(workflow.id, newName)
      
      setWorkflows(workflows.map(w => 
        w.id === workflow.id ? { ...w, name: newName } : w
      ))

      if (onSelect && workflow.id) {
        onSelect(workflow.id)
      }
    } catch (error) {
      logError(`Failed to update workflow name: ${error}`)
    }
  }

  const handleDelete = async (workflow: Workflow) => {
    if (!workflow.id) return
    
    try {
      await WorkflowApi.deleteWorkflow(workflow.id)
      
      const updatedWorkflows = await WorkflowApi.getWorkflows()
      setWorkflows(updatedWorkflows)
      
      if (selectedId === workflow.id && updatedWorkflows.length > 0 && updatedWorkflows[0].id) {
        onSelect(updatedWorkflows[0].id)
      }
    } catch (error) {
      logError(`Failed to delete workflow: ${error}`)
    }
  }

  const handleUpdateSettings = async (workflow: Workflow, newSettings: Workflow['settings']) => {
    if (!workflow.id) return

    const updatedWorkflow: Workflow = {
      ...workflow,
      settings: newSettings
    }

    try {
      const savedWorkflow = await WorkflowApi.saveWorkflow(updatedWorkflow)
      setWorkflows(workflows.map(w => w.id === savedWorkflow.id ? savedWorkflow : w))
      if (onSettingsChange && savedWorkflow.id) {
        onSettingsChange(savedWorkflow.id, savedWorkflow.settings)
      }
    } catch (error) {
      logError(`Failed to update workflow settings: ${error}`)
    }
  }

  return (
    <>
      <div className="relative w-full">
        <style dangerouslySetInnerHTML={{
          __html: `
            [data-scrollbar-hide]::-webkit-scrollbar {
              display: none;
            }
          `
        }} />
        {showLeftMask && (
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
        )}
        <motion.div 
          ref={scrollContainerRef}
          className="flex gap-2 items-center overflow-x-auto scroll-smooth px-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
          data-scrollbar-hide
          layout
        >
          {workflows.length === 0 ? (
            <Badge 
              variant='secondary' 
              className='cursor-pointer border-dashed'
              onClick={() => handleSelect('new')}
            >
              Create profile
            </Badge>
          ) : (
            <>
              {workflows.map((workflow) => (
                <WorkflowBadge
                  key={workflow.id}
                  workflow={workflow}
                  isSelected={workflow.id === selectedId}
                  onClick={() => workflow.id && handleSelect(workflow.id)}
                  onRename={(newName) => handleRename(workflow, newName)}
                  onDelete={() => handleDelete(workflow)}
                  onUpdateSettings={(settings) => handleUpdateSettings(workflow, settings)}
                  data-workflow-id={workflow.id}
                />
              ))}
              
              {workflows.length < 6 && (
                <motion.div layout>
                  {workflows.length >= 1 && !canUseMultipleProfiles ? (
                    <PaywallDialog>
                      <Badge 
                        variant='secondary' 
                        className='cursor-pointer border-dashed opacity-50 px-4'
                      >
                        +
                      </Badge>
                    </PaywallDialog>
                  ) : (
                    <Badge 
                      variant='secondary' 
                      className='cursor-pointer border-dashed opacity-50 px-4'
                      onClick={() => handleSelect('new')}
                    >
                      +
                    </Badge>
                  )}
                </motion.div>
              )}
            </>
          )}
        </motion.div>
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
      </div>
    </>
  )
} 
