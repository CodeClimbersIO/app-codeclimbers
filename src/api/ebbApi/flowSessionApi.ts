import { QueryResult } from '@tauri-apps/plugin-sql'
import { FlowSession, FlowSessionRepo, FlowSessionSchema } from '@/db/ebb/flowSessionRepo'

const startFlowSession = async (
  objective: string, 
  duration?: number,
): Promise<string> => {
  const flowSession: FlowSessionSchema = {
    id: self.crypto.randomUUID(),
    start: new Date().toISOString(),
    objective,
    self_score: 0,
    duration: duration ? duration * 60 : undefined,
  }
  
  if (await FlowSessionRepo.getInProgressFlowSession()) {
    throw new Error('Flow session already in progress')
  }
  
  await FlowSessionRepo.createFlowSession(flowSession)
  
  return flowSession.id
}

const endFlowSession = async (id: string): Promise<QueryResult> => {
  const flowSession = await FlowSessionRepo.getInProgressFlowSession()
  if (!flowSession) {
    throw new Error('Flow session not found')
  }

  const flowSessionUpdated: Partial<FlowSession> & { id: string } = {
    id,
    end: new Date().toISOString(),
  }

  return FlowSessionRepo.updateFlowSession(flowSessionUpdated)
}

const scoreFlowSession = async (
  id: string,
  score: number,
): Promise<QueryResult> => {
  const flowSession: Partial<FlowSession> & { id: string } = {
    id,
    self_score: score,
  }
  return FlowSessionRepo.updateFlowSession(flowSession)
}

const getInProgressFlowSession = async () => {
  return FlowSessionRepo.getInProgressFlowSession()
}

const getFlowSessions = async (limit = 10): Promise<FlowSession[]> => {
  const flowSessions = await FlowSessionRepo.getFlowSessions(limit)
  return flowSessions
}

const updateFlowSessionDuration = async (id: string, newDuration: number): Promise<QueryResult> => {
  const flowSession: Partial<FlowSession> & { id: string } = {
    id,
    duration: newDuration,
  }
  return FlowSessionRepo.updateFlowSession(flowSession)
}

export const FlowSessionApi = {
  startFlowSession,
  endFlowSession,
  scoreFlowSession,
  getInProgressFlowSession,
  getFlowSessions,
  updateFlowSessionDuration,
}
