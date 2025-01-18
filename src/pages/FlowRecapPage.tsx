import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { InfoIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { FlowSessionApi } from '../api/ebbApi/flowSessionApi'
import { DateTime } from 'luxon'
import { FlowChart } from '@/components/ui/flow-chart'

interface LocationState {
  sessionId: string
  flowScore: number
  timeInFlow: string
  contextSwitches: number
  idleTime: string
  objective: string
  startTime: string
  endTime: string
}

export const FlowRecapPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [rating, setRating] = useState<number | null>(null)
  const state = location.state as LocationState

  useEffect(() => {
    if (!state?.sessionId) {
      navigate('/')
    }
  }, [state, navigate])

  const handleFinish = async () => {
    if (!state?.sessionId || rating === null) return
    await FlowSessionApi.scoreFlowSession(state.sessionId, rating)
    navigate('/')
  }

  const formatTimeRange = () => {
    const start = DateTime.fromISO(state?.startTime)
    const end = DateTime.fromISO(state?.endTime)
    return `${start.toFormat('h:mm a')} - ${end.toFormat('h:mm a')}`
  }

  const generateMockData = () => {
    const start = DateTime.fromISO(state?.startTime)
    const end = DateTime.fromISO(state?.endTime)
    const totalMinutes = end.diff(start, 'minutes').minutes
    const intervalMinutes = Math.floor(totalMinutes / 9) // 9 intervals = 10 points

    return Array.from({ length: 10 }, (_, i) => ({
      time: start.plus({ minutes: i * intervalMinutes }).toJSDate(),
      value: Math.sin(i * 0.5) * (state?.flowScore / 2) + state?.flowScore / 2,
      appSwitches: Math.floor(Math.random() * 10)
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-3xl">
        <CardContent className="p-6 space-y-8">
          <div className="mb-4 flex justify-between items-center">
            <div className="text-sm">
              <span className="font-medium">"{state?.objective}"</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatTimeRange()}
            </div>
          </div>

          <div className="h-40 my-8">
            <FlowChart
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data={generateMockData() as any}
              flowScore={state?.flowScore}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <StatItem
              label="Avg Flow Score"
              value={state?.flowScore.toFixed(1)}
              tooltip="Average flow score during your session"
            />
            <StatItem
              label="Time in Flow"
              value={state?.timeInFlow}
              tooltip="Total time spent with a Flow Score > 5"
            />
            <StatItem
              label="App Switches"
              value={state?.contextSwitches}
              tooltip="Number of times you switched between applications"
            />
            <StatItem
              label="Idle Time"
              value={state?.idleTime}
              tooltip="Total time spent inactive"
            />
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-lg font-medium">How would you rate your session?</h2>
            <div className="py-4">
              <div className="flex justify-between mb-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <span key={num} className="text-sm text-muted-foreground">
                    {num}
                  </span>
                ))}
              </div>
              <Slider
                value={[rating ?? 5]}
                onValueChange={(value) => setRating(value[0])}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          <Button
            onClick={handleFinish}
            className="w-full"
            disabled={rating === null}
          >
            {rating === null ? 'Please rate your session' : 'Finish'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

interface StatItemProps {
  label: string
  value: string | number
  tooltip: string
}

const StatItem = ({ label, value, tooltip }: StatItemProps) => (
  <div className="bg-muted/50 rounded-lg p-4">
    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
      {label}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <InfoIcon className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    <div className="text-xl font-semibold">{value}</div>
  </div>
)
