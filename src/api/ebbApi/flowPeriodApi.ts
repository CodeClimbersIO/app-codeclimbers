import { QueryResult } from '@tauri-apps/plugin-sql'
import { Activity, ActivityState, ActivityStateType, ActivityType } from '../../db/activityState'
import { FlowPeriod, FlowPeriodDb } from '../../db/flowPeriod'
import { DateTime, Duration } from 'luxon'
import { MonitorApi } from '../monitorApi'
import { FlowSessionDb } from '../../db/flowSession'

interface Period {
  start: DateTime
  end: DateTime
}

interface FlowPeriodScore {
  activityScore: {
    score: number
    detail: number
  }
  appSwitchScore: {
    score: number
    detail: number
  }
  flowStreakScore: {
    score: number
    detail: number
  }
  topActivity: {
    score: string
    detail: Activity[]
  }
  totalScore: number
}

/**
 * Activity score is the number of active states, capped at 5. 
 * Each active state is 30 seconds in the 10 minute period.
 * For each minute after 2 minutes, add 1 point.
 */
const getActivityScoreForActivityStates = (
  activityStates: ActivityState[]
): [number, number] => {
  const activeStates = activityStates.filter(
    state => state.state === ActivityStateType.Active
  ).length
  
  const activityScore = Math.min((activeStates - 4) / 2, 5)
  return [Math.max(activityScore, 0), activeStates]
}

const getAppSwitchScoreForActivityStates = (
  activityStates: ActivityState[]
): [number, number] => {
  if (activityStates.length === 0) {
    return [0.0, 0.0]
  }


  const appSwitchTotal = activityStates.reduce((sum, state) => sum + state.app_switches, 0)
  const appSwitchAvg = appSwitchTotal / activityStates.length

  if (appSwitchAvg <= 4.0) {
    return [1.0, appSwitchTotal]
  } else if (appSwitchAvg <= 8.0) {
    return [0.5, appSwitchTotal]
  } else {
    return [0.0, appSwitchTotal]
  }
}

const getFlowStreakScoreForPeriod = (flowPeriods: FlowPeriod[]): [number,number] => {
  let streak = 0
  const flowPeriodsDesc = flowPeriods.reverse()
  // assumes flow periods are order by start time ascending
  for (const flowPeriod of flowPeriodsDesc) {
    if (flowPeriod.score > 5) {
      streak += 1
    } else {
      break
    }
  }
  const score = Math.min(streak, 4)
  return [score, streak]
}

const getTopActivity = (activityStates: ActivityState[]): [string, Activity[]] => {
  const activities = activityStates.flatMap(state => state.activities_json).filter(activity => activity.activity_type === ActivityType.Window)
  const topActivity = activities.reduce((acc, activity) => {
    acc[activity.app_name] = (acc[activity.app_name] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const sortedActivities = Object.keys(topActivity).sort((a, b) => topActivity[b] - topActivity[a])
  return [sortedActivities[0], activities]
}

const getFlowPeriodScore = (activityStates: ActivityState[], flowPeriods: FlowPeriod[]): FlowPeriodScore => {
  const [activityScore, activityDetail] = getActivityScoreForActivityStates(activityStates)
  const [topActivity, topActivityDetail] = getTopActivity(activityStates)
  const [appSwitchScore, appSwitchDetail] = getAppSwitchScoreForActivityStates(activityStates)
  const [flowStreakScore, flowStreakDetail] = getFlowStreakScoreForPeriod(flowPeriods)
  return {
    activityScore: {
      score: activityScore,
      detail: activityDetail
    },
    appSwitchScore: {
      score: appSwitchScore,
      detail: appSwitchDetail
    },
    flowStreakScore: {
      score: flowStreakScore,
      detail: flowStreakDetail
    },
    topActivity: {
      score: topActivity,
      detail: topActivityDetail
    },
    totalScore: activityScore + appSwitchScore + flowStreakScore
  }
}


/**
 * Get next period to run the interval job
 * If there is no last flow period, then the start of the next period is the current time
 * If the end of the last flow period + the interval is greater than the current time, then the end of the last flow period is the start of the next period
 * If the end of the last flow period + the interval is less than the current time, then the start of the next period is the current time
 * If the end of the last flow period is after now, then the start of the next period is now
 */
const getNextFlowPeriod = (lastFlowPeriod: FlowPeriod | undefined, intervalMs: number): Period => {
  if(!lastFlowPeriod) {
    return {
      start: DateTime.now(),
      end: DateTime.now().plus({ milliseconds: intervalMs })
    }
  }
  const lastFlowPeriodEnd = DateTime.fromISO(lastFlowPeriod.end_time)
  if(lastFlowPeriodEnd.toMillis() > DateTime.now().toMillis()) {
    return {
      start: DateTime.now(),
      end: DateTime.now().plus({ milliseconds: intervalMs })
    }
  }
  if(lastFlowPeriodEnd.plus({ milliseconds: intervalMs }).toMillis() > DateTime.now().toMillis()) {
    return {
      start: lastFlowPeriodEnd,
      end: lastFlowPeriodEnd.plus({ milliseconds: intervalMs })
    }
  } else {
    return {
      start: DateTime.now(),
      end: DateTime.now().plus({ milliseconds: intervalMs })
    }
  }
}

const getFlowPeriodScoreForPeriod = async (flowPeriod: Period, sessionPeriod: Period): Promise<FlowPeriodScore> => {
  if(!flowPeriod.start.toISO() || !flowPeriod.end.toISO()) {
    throw new Error('Start and end for flow period must be defined')
  }
  if(!sessionPeriod.start.toISO() || !sessionPeriod.end.toISO()) {
    throw new Error('Start and end for session period must be defined')
  }

  const activityStates = await MonitorApi.getActivityStatesBetween(flowPeriod.start, flowPeriod.end)
  const flowPeriods = await FlowPeriodDb.getFlowPeriodsBetween(sessionPeriod.start, sessionPeriod.end)
  const flowPeriodScore = getFlowPeriodScore(activityStates, flowPeriods)
  return flowPeriodScore
}

const createFlowPeriod = async (period: FlowPeriod): Promise<QueryResult> => {
  return FlowPeriodDb.createFlowPeriod(period)
}

const SHOULD_SAVE_FLOW_PERIOD = false

const calculateFlowPeriodScore = async (period: Period, previousFlowPeriodId: number | undefined)=>{
  console.log('Calculating flow period score')
  const session = await FlowSessionDb.getInProgressFlowSession()
  if(!session) {
    return
  }
  const sessionPeriod = {
    start: DateTime.fromISO(session.start),
    end: DateTime.now()
  }
  
  const flowPeriodScore = await getFlowPeriodScoreForPeriod(period, sessionPeriod)


  console.log('period', period)
  console.log('flowPeriodScore', flowPeriodScore)
  console.log('sessionPeriod', sessionPeriod)
  console.log('previousFlowPeriodId', previousFlowPeriodId)


  if (SHOULD_SAVE_FLOW_PERIOD) {
    await createFlowPeriod({
      start_time: period.start.toUTC().toISO()!,
      end_time: period.end.toUTC().toISO()!,
      score: flowPeriodScore.totalScore,
      details: JSON.stringify(flowPeriodScore),
      created_at: DateTime.now().toUTC().toISO()!,
      previous_flow_period_id: previousFlowPeriodId
    })
  }
}

let isJobRunning = false
const TEN_MINUTES = 10 * 60 * 1000

const startFlowPeriodScoreJob = async (intervalMs = TEN_MINUTES): Promise<void> => {
  if (isJobRunning) {
    return
  }
  isJobRunning = true
    // First determine when we should start
  const lastFlowPeriod = await FlowPeriodDb.getLastFlowPeriod()
  const nextPeriod = getNextFlowPeriod(lastFlowPeriod, intervalMs)
  const initialWait = nextPeriod.end.diff(DateTime.now()).milliseconds
  console.table([
    {
      event: 'Last started at',
      time: DateTime.fromISO(lastFlowPeriod?.start_time || '').toISO()
    },
    {
      event: 'Last ended at',
      time: DateTime.fromISO(lastFlowPeriod?.end_time || '').toISO()
    },
    {
      event: 'Next starts at',
      time: nextPeriod.start.toISO()
    },
    {
      event: 'Next ends at',
      time: nextPeriod.end.toISO()
    }
  ], ['event', 'time'])
  console.log('Remaining time:', Duration.fromMillis(initialWait).toFormat('hh:mm:ss'))

  setTimeout(async () => {
    await calculateFlowPeriodScore(nextPeriod, lastFlowPeriod?.id)
    // Start the recurring interval after the first calculation
    setInterval(async () => {
      const lastFlowPeriod = await FlowPeriodDb.getLastFlowPeriod()
      const period = getNextFlowPeriod(lastFlowPeriod, intervalMs)
      await calculateFlowPeriodScore(period, lastFlowPeriod?.id)
    }, 30 * 1000)
  }, 1000)
}

export const FlowPeriodApi = {
  getActivityScoreForActivityStates,
  getAppSwitchScoreForActivityStates,
  getFlowStreakScoreForPeriod,
  getTopActivity,
  getFlowPeriodScore,
  getFlowPeriodScoreForPeriod,
  getNextFlowPeriod,
  createFlowPeriod,
  startFlowPeriodScoreJob,
}
