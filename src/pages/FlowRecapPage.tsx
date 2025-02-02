import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, WandSparkles, Diff } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DateTime } from 'luxon'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from '@/components/ui/chart'
import { TopNav } from '@/components/TopNav'
import { LogoContainer } from '@/components/LogoContainer'
import confetti from 'canvas-confetti'

interface LocationState {
  sessionId: string
  timeInFlow: string
  contextSwitches: number
  idleTime: string
  objective: string
  startTime: string
  endTime: string
}

const generateSessionData = (startTime: string, endTime: string) => {
  const start = DateTime.fromISO(startTime)
  const end = DateTime.fromISO(endTime)
  const totalMinutes = end.diff(start, 'minutes').minutes
  const intervalMinutes = Math.floor(totalMinutes / 9) // 9 intervals = 10 points

  return Array.from({ length: 10 }, (_, i) => {
    const time = start.plus({ minutes: i * intervalMinutes })
    const displayTime = time.toFormat('h:mm a')
    const nextTime = time.plus({ minutes: intervalMinutes }).toFormat('h:mm a')
    const timeRange = `${displayTime} - ${nextTime}`
    const showLabel = i % 2 === 0

    return {
      time: time.toJSDate(),
      timeRange,
      xAxisLabel: showLabel ? displayTime : '',
      creating: Math.floor(Math.random() * 40),
      consuming: Math.floor(Math.random() * 20),
      offline: Math.floor(Math.random() * 10)
    }
  })
}

const chartConfig = {
  consuming: {
    label: 'Consuming',
    color: 'rgb(248, 113, 113)',
  },
  creating: {
    label: 'Creating',
    color: 'rgb(124,58,237)',
  },
} satisfies ChartConfig

const formatDuration = (startTime: string, endTime: string): string => {
  const start = DateTime.fromISO(startTime)
  const end = DateTime.fromISO(endTime)
  const diff = end.diff(start, ['hours', 'minutes', 'seconds'])
  
  if (diff.hours >= 1) {
    return `${Math.floor(diff.hours)}h ${Math.floor(diff.minutes)}m`
  }
  return `${Math.floor(diff.minutes)}m ${Math.floor(diff.seconds)}s`
}

export const FlowRecapPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState
  const effectRan = useRef(false)

  useEffect(() => {
    if (effectRan.current) return
    effectRan.current = true

    // Add random 50/50 chance
    const isPositive = Math.random() >= 0.5

    if (isPositive) {
      const duration = 1000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min
      }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          return clearInterval(interval)
        }

        const particleCount = 50 * (timeLeft / duration)

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#7c3aed', '#4c1d95', '#6d28d9'], // Purple shades
        })
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#7c3aed', '#4c1d95', '#6d28d9'], // Purple shades
        })
      }, 250)
    } else {
      const card = document.querySelector('.recap-card')
      card?.classList.add('negative-score')
      
      setTimeout(() => {
        card?.classList.remove('negative-score')
      }, 1000)
    }
  }, [state, navigate])

  if (!state) {
    return <div>Loading...</div>
  }

  const formatTimeRange = () => {
    if (!state.startTime || !state.endTime) return ''
    const start = DateTime.fromISO(state.startTime)
    const end = DateTime.fromISO(state.endTime)
    return `${start.toFormat('h:mm a')} - ${end.toFormat('h:mm a')}`
  }

  const chartData = generateSessionData(state.startTime, state.endTime)

  // Mock data for demonstration - replace with real data later
  const topApps = ['VS Code', 'Chrome', 'Slack'].map(name => ({
    name,
    icon: '', // This would come from your apps directory
  }))

  return (
    <div className="flex flex-col h-screen">
      <div className="flex">
        <LogoContainer />
        <TopNav variant="modal" />
      </div>
      <div className="flex-1 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Card className="recap-card w-full max-w-3xl transition-all duration-300">
          <CardContent className="p-6 space-y-8">
            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm">
                <span className="font-medium">'{state?.objective}'</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {formatTimeRange()}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Duration
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="text-2xl font-bold">
                          {formatDuration(state?.startTime, state?.endTime)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total duration of your focus session</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Time Creating
                  </CardTitle>
                  <WandSparkles className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="text-2xl font-bold">
                          5h 3m
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total time spent creating during session</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Net Creation
                  </CardTitle>
                  <Diff className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="text-2xl font-bold">
                          22.1
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Positive = more creation, Negative = more consumption</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Top Apps Used
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    {topApps.map((app, index) => (
                      <div
                        key={index}
                        className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"
                      >
                        {app.icon ? (
                          <img
                            src={`/src/lib/app-directory/icons/${app.icon}`}
                            alt={app.name}
                            className="h-5 w-5"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              const parent = target.parentElement
                              if (parent) {
                                parent.textContent = '💻'
                              }
                            }}
                          />
                        ) : (
                          <span className="text-muted-foreground">💻</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <ChartContainer config={chartConfig}>
                  <BarChart height={200} data={chartData}>
                    <CartesianGrid
                      vertical={false}
                      stroke="hsl(var(--border))"
                      strokeOpacity={0.8}
                    />
                    <XAxis
                      dataKey="xAxisLabel"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      interval={0}
                    />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const data = payload[0].payload
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-md">
                            <div className="mb-2 font-medium">{data.timeRange}</div>
                            <div className="space-y-1">
                              <div className="text-[rgb(124,58,237)]">Creating: {data.creating} min</div>
                              <div className="text-[rgb(239,68,68)]">Consuming: {data.consuming} min</div>
                              <div className="text-gray-500">Offline: {data.offline} min</div>
                            </div>
                          </div>
                        )
                      }}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="consuming"
                      stackId="a"
                      fill={chartConfig.consuming.color}
                      radius={[0, 0, 4, 4]}
                      barSize={20}
                    />
                    <Bar
                      dataKey="creating"
                      stackId="a"
                      fill={chartConfig.creating.color}
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}
