import { QueryResult } from '@tauri-apps/plugin-sql'
import { FlowSession, FlowSessionDb } from '../../db/flowSession'

const startFlowSession = async (objective: string, duration?: number): Promise<string> => {
  const flowSession: FlowSessionDb = {
    id: self.crypto.randomUUID(),
    start: new Date().toISOString(),
    objective,
    self_score: 0,
    duration: duration ? duration * 60 : undefined,
  }
  if (await FlowSessionDb.getInProgressFlowSession()) {
    throw new Error('Flow session already in progress')
  }
  await FlowSessionDb.createFlowSession(flowSession)
  return flowSession.id
}

const endFlowSession = async (id: string): Promise<QueryResult> => {
  const flowSession = await FlowSessionDb.getInProgressFlowSession()
  if (!flowSession) {
    throw new Error('Flow session not found')
  }

  const flowSessionUpdated: Partial<FlowSession> & { id: string } = {
    id,
    end: new Date().toISOString(),
  }

  return FlowSessionDb.updateFlowSession(flowSessionUpdated)
}

const scoreFlowSession = async (
  id: string,
  score: number,
): Promise<QueryResult> => {
  const flowSession: Partial<FlowSession> & { id: string } = {
    id,
    self_score: score,
  }
  return FlowSessionDb.updateFlowSession(flowSession)
}

const getInProgressFlowSession = async () => {
  return FlowSessionDb.getInProgressFlowSession()
}

const getFlowSessions = async (limit = 10): Promise<FlowSession[]> => {
  const flowSessions = await FlowSessionDb.getFlowSessions(limit)
  return flowSessions
}

export const FlowSessionApi = {
  startFlowSession,
  endFlowSession,
  scoreFlowSession,
  getInProgressFlowSession,
  getFlowSessions,
}
