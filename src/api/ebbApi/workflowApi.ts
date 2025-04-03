import { SearchOption } from '@/components/AppSelector'
import { WorkflowDb, WorkflowRepo, WorkflowSettings } from '@/db/ebb/workflowRepo'
import { getEbbDb } from '@/db/ebb/ebbDb'
import { BlockingPreferenceApi } from './blockingPreferenceApi'
export interface Workflow {
  id?: string
  name: string
  selectedApps: SearchOption[]
  selectedPlaylist?: string | null
  selectedPlaylistName?: string | null
  lastSelected?: number
  settings: {
    hasTypewriter: boolean
    hasBreathing: boolean
    hasMusic: boolean
    isAllowList?: boolean
    defaultDuration: number | null
    difficulty?: 'easy' | 'medium' | 'hard' | null
  }
}

// Convert DB workflow to frontend Workflow format
const fromDbWorkflow = async (dbWorkflow: WorkflowDb): Promise<Workflow> => {
  const settings: WorkflowSettings = JSON.parse(dbWorkflow.settings)
  
  // Get blocking preferences from the blocking_preference table
  let selectedApps: SearchOption[] = []
  try {
    selectedApps = await BlockingPreferenceApi.getWorkflowBlockingPreferencesAsSearchOptions(dbWorkflow.id)
  } catch (error) {
    console.error(`Failed to load blocking preferences for workflow ${dbWorkflow.id}:`, error)
  }
  
  return {
    id: dbWorkflow.id,
    name: dbWorkflow.name,
    selectedApps: selectedApps,
    selectedPlaylist: settings.selectedPlaylist,
    selectedPlaylistName: settings.selectedPlaylistName,
    lastSelected: dbWorkflow.last_selected ? new Date(dbWorkflow.last_selected).getTime() : undefined,
    settings: {
      hasTypewriter: settings.hasTypewriter,
      hasBreathing: settings.hasBreathing,
      hasMusic: settings.hasMusic,
      isAllowList: settings.isAllowList || false,
      defaultDuration: settings.defaultDuration,
      difficulty: settings.difficulty
    }
  }
}

// Convert frontend Workflow to DB format
const toDbWorkflow = (workflow: Workflow): Partial<WorkflowDb> => {
  const settings: WorkflowSettings = {
    hasTypewriter: workflow.settings.hasTypewriter,
    hasBreathing: workflow.settings.hasBreathing,
    hasMusic: workflow.settings.hasMusic,
    isAllowList: workflow.settings.isAllowList,
    defaultDuration: workflow.settings.defaultDuration,
    selectedPlaylist: workflow.selectedPlaylist,
    selectedPlaylistName: workflow.selectedPlaylistName,
    difficulty: workflow.settings.difficulty
  }
  
  const dbWorkflow: Partial<WorkflowDb> = {
    name: workflow.name,
    settings: JSON.stringify(settings),
    last_selected: workflow.lastSelected ? new Date(workflow.lastSelected).toISOString() : null
  }

  // Only include ID if it exists (for existing workflows)
  if (workflow.id) {
    dbWorkflow.id = workflow.id
  }
  
  return dbWorkflow
}

const getWorkflows = async (): Promise<Workflow[]> => {
  const ebbDb = await getEbbDb()
  const rows = await ebbDb.select<WorkflowDb[]>(
    'SELECT * FROM workflow ORDER BY created_at DESC'
  )
  
  const workflows = await Promise.all(rows.map(fromDbWorkflow))
  return workflows
}

const getWorkflowById = async (id: string): Promise<Workflow | null> => {
  const workflowDb = await WorkflowRepo.getWorkflowById(id)
  if (!workflowDb) return null
  
  return await fromDbWorkflow(workflowDb)
}

const saveWorkflow = async (workflow: Workflow): Promise<Workflow> => {
  const dbWorkflow = toDbWorkflow(workflow)
  
  const isNewWorkflow = !workflow.id
  if (isNewWorkflow) {
    delete dbWorkflow.id
  }
  
  const workflowId = await WorkflowRepo.saveWorkflow(dbWorkflow)
  
  await BlockingPreferenceApi.saveWorkflowBlockingPreferences(workflowId, workflow.selectedApps)
  
  const savedWorkflow = await getWorkflowById(workflowId)
  if (!savedWorkflow) {
    throw new Error('Failed to retrieve saved workflow')
  }
  return savedWorkflow
}

const deleteWorkflow = async (id: string): Promise<void> => {
  await WorkflowRepo.deleteWorkflow(id)
  
  await BlockingPreferenceApi.saveWorkflowBlockingPreferences(id, [])
}

const updateLastSelected = async (id: string): Promise<void> => {
  await WorkflowRepo.updateLastSelected(id)
}

const renameWorkflow = async (id: string, newName: string): Promise<void> => {
  await WorkflowRepo.updateWorkflowName(id, newName)
}

export const WorkflowApi = {
  getWorkflows,
  getWorkflowById,
  saveWorkflow,
  deleteWorkflow,
  updateLastSelected,
  renameWorkflow
} 
