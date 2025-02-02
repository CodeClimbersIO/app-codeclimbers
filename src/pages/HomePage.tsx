import { Layout } from '@/components/Layout'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { WandSparkles, Flame, ChevronDown, Diff } from 'lucide-react'
import { FlowSessionApi } from '../api/ebbApi/flowSessionApi'
import { useSettings } from '../hooks/useSettings'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DateTime } from 'luxon'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from '@/components/ui/chart'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Progress } from '@/components/ui/progress'
import { apps } from '@/lib/app-directory/apps-list'
import { categoryEmojis, AppDefinition, ActivityRating } from '@/lib/app-directory/apps-types'
import { Slider } from '@/components/ui/slider'
import { useAuth } from '../hooks/useAuth'

const generateHourlyData = () => {
  const data = []
  const currentHour = DateTime.now().hour

  // Always show structure from 6 AM to midnight
  for (let hour = 6; hour < 24; hour++) {
    const time = `${hour}:00`
    const displayTime = DateTime.now().set({ hour, minute: 0 }).toFormat('h:mm a')
    const nextHour = DateTime.now().set({ hour: hour + 1, minute: 0 }).toFormat('h:mm a')
    const timeRange = `${displayTime} - ${nextHour}`

    const showLabel = [6, 10, 14, 18, 22].includes(hour)
    const xAxisLabel = showLabel ? DateTime.now().set({ hour }).toFormat('h a') : ''

    // Only generate data for hours up to current hour
    let creating = 0
    let consuming = 0
    let offline = 0

    if (hour <= currentHour) {
      creating = Math.floor(Math.random() * 40)
      consuming = Math.floor(Math.random() * (60 - creating))
      offline = 60 - creating - consuming
    }

    data.push({
      time,
      timeRange,
      xAxisLabel,
      creating,
      consuming,
      offline,
    })
  }
  return data
}

const chartData = generateHourlyData()

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

type AppUsage = {
  name: string
  icon: string
  timeSpent: number // in minutes
  rating: ActivityRating // Using rating (1-5) instead of category
}

// Helper function to get random items from array
const getRandomItems = (array: AppDefinition[], count: number) => {
  const shuffled = [...array].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

// Update the usage apps to use ratings
const usageApps = getRandomItems(apps, 6).map(app => ({
  name: app.type === 'application' ? app.name : app.websiteUrl,
  icon: app.icon,
  timeSpent: Math.floor(Math.random() * 180) + 30,
  rating: app.defaultRating
}))

const calculateNetCreationScore = (apps: AppUsage[]): number => {
  return Number(apps.reduce((score, app) => {
    const minutes = app.timeSpent
    switch (app.rating) {
      case 5: // High Creation
        return score + minutes * 0.1
      case 4: // Creation
        return score + minutes * 0.05
      case 2: // Consumption
        return score - minutes * 0.05
      case 1: // High Consumption
        return score - minutes * 0.1
      default: // Neutral (3)
        return score
    }
  }, 0).toFixed(1))
}

export const HomePage = () => {
  const { user } = useAuth()
  const { showZeroState } = useSettings()
  const navigate = useNavigate()
  const [hasNoSessions, setHasNoSessions] = useState(true)
  const [streak, setStreak] = useState(0)
  const [date, setDate] = useState<Date>(new Date())
  const [appUsage, setAppUsage] = useState<AppUsage[]>(usageApps)
  const appUsageRef = useRef<HTMLDivElement>(null)

  // Get first name from user metadata
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 
                   user?.user_metadata?.name?.split(' ')[0] || 
                   user?.email?.split('@')[0]

  useEffect(() => {
    const init = async () => {
      const flowSession = await FlowSessionApi.getInProgressFlowSession()
      if (flowSession) {
        navigate('/flow')
      }
      const sessions = await FlowSessionApi.getFlowSessions()
      setHasNoSessions(sessions.length === 0)

      // Get streak data
      let currentStreak = 0
      let currentDate = DateTime.now().startOf('day')
      let daysToCheck = 30

      while (daysToCheck > 0) {
        if (currentDate.weekday >= 6) {
          currentDate = currentDate.minus({ days: 1 })
          continue
        }

        currentStreak++
        currentDate = currentDate.minus({ days: 1 })
        daysToCheck--
      }

      setStreak(currentStreak)
    }
    init()
  }, [])

  const handleStartFlowSession = () => {
    navigate('/start-flow')
  }

  const scrollToAppUsage = () => {
    appUsageRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (showZeroState || hasNoSessions) {
    return (
      <Layout>
        <div className="p-8">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-semibold mb-8">
              {firstName ? `Welcome, ${firstName}` : 'Welcome'}
            </h1>
            <div className="border rounded-lg p-8 text-center">
              <h2 className="text-xl font-medium mb-4">Ready to start your flow journey?</h2>
              <p className="text-muted-foreground mb-6">
                It's time to lock in and improve your focus
              </p>
              <Button size="lg" onClick={handleStartFlowSession}>
                <WandSparkles className="mr-2 h-5 w-5" />
                Start Focus Session
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // Sort app usage in the render section, before mapping
  const sortedAppUsage = [...appUsage].sort((a, b) => b.timeSpent - a.timeSpent)

  return (
    <Layout>
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold">
                {firstName ? `Welcome, ${firstName}` : 'Welcome'}
              </h1>
              {streak > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1 text-orange-500">
                        <Flame className="h-5 w-5" />
                        <span className="font-medium">{streak}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Number of consecutive days with a focus session, excluding weekends</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal"
                >
                  <div className="flex items-center gap-2">
                    {date.toLocaleDateString() === new Date().toLocaleDateString()
                      ? 'Today'
                      : DateTime.fromJSDate(date).toFormat('LLL dd, yyyy')}
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => newDate && setDate(newDate)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <TooltipProvider>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Time Spent Creating
                  </CardTitle>
                  <WandSparkles className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="text-2xl font-bold">3h 45m</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total time spent creating today</p>
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Net Creation</CardTitle>
                  <Diff className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="text-2xl font-bold">
                        {calculateNetCreationScore(appUsage) > 0 ? '+' : ''}
                        {calculateNetCreationScore(appUsage)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Positive = more creation, Negative = more consumption</p>
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Top Apps/Websites</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    {sortedAppUsage.slice(0, 3).map((app, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        className="w-8 h-8 p-0"
                        onClick={scrollToAppUsage}
                      >
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                          {app.icon ? (
                            <img
                              src={`/src/lib/app-directory/icons/${app.icon}`}
                              alt={app.name}
                              className="h-5 w-5"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                const parent = target.parentElement
                                const appDef = apps.find(a =>
                                  (a.type === 'application' && a.name === app.name) ||
                                  (a.type === 'website' && a.websiteUrl === app.name)
                                )
                                if (parent && appDef) {
                                  parent.textContent = categoryEmojis[appDef.category]
                                }
                              }}
                            />
                          ) : (
                            <span className="text-muted-foreground">❓</span>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TooltipProvider>
          </div>

          <Card>
            <CardContent className="pt-6">
              <ChartContainer config={chartConfig}>
                <BarChart height={200} data={chartData}>
                  <defs>
                    <linearGradient id="creatingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(124 58 237)" stopOpacity={1} />
                      <stop offset="100%" stopColor="rgb(124 58 237)" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="consumingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(239 68 68)" stopOpacity={1} />
                      <stop offset="100%" stopColor="rgb(239 68 68)" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
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

          <Card className="mt-4" ref={appUsageRef}>
            <CardHeader>
              <CardTitle>App/Website Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sortedAppUsage.map((app) => (
                  <div key={app.name} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      {app.icon ? (
                        <img
                          src={`/src/lib/app-directory/icons/${app.icon}`}
                          alt={app.name}
                          className="h-5 w-5"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            const parent = target.parentElement
                            const appDef = apps.find(a =>
                              (a.type === 'application' && a.name === app.name) ||
                              (a.type === 'website' && a.websiteUrl === app.name)
                            )
                            if (parent && appDef) {
                              parent.textContent = categoryEmojis[appDef.category]
                            } else if (parent) {
                              // Fallback to using the app's category that we already have
                              const foundApp = apps.find(a =>
                                (a.type === 'application' && a.name === app.name) ||
                                (a.type === 'website' && a.websiteUrl === app.name)
                              )
                              parent.textContent = foundApp ? categoryEmojis[foundApp.category] : '❓'
                            }
                          }}
                        />
                      ) : (
                        <span className="text-muted-foreground">❓</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{app.name}</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <div className="w-[80px]">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-6 px-2 py-0 text-xs font-medium justify-start ${app.rating >= 4 ? 'text-[rgb(124,58,237)] hover:bg-primary/10' :
                                      app.rating <= 2 ? 'text-[rgb(239,68,68)] hover:bg-destructive/10' :
                                        'text-gray-500 hover:bg-muted'
                                    }`}
                                >
                                  {app.rating === 5 ? 'High Creation' :
                                    app.rating === 4 ? 'Creation' :
                                      app.rating === 3 ? 'Neutral' :
                                        app.rating === 2 ? 'Consumption' :
                                          'High Consumption'}
                                </Button>
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-4">
                              <div className="space-y-4">
                                <div className="relative">
                                  <Slider
                                    defaultValue={[app.rating]}
                                    max={5}
                                    min={1}
                                    step={1}
                                    trackColor={
                                      app.rating >= 4
                                        ? 'bg-[rgb(124,58,237)]/20'
                                        : app.rating <= 2
                                          ? 'bg-[rgb(239,68,68)]/20'
                                          : 'bg-gray-500/20'
                                    }
                                    rangeColor={
                                      app.rating >= 4
                                        ? 'bg-[rgb(124,58,237)]'
                                        : app.rating <= 2
                                          ? 'bg-[rgb(239,68,68)]'
                                          : 'bg-gray-500'
                                    }
                                    thumbBorderColor={
                                      app.rating >= 4
                                        ? 'border-[rgb(124,58,237)]'
                                        : app.rating <= 2
                                          ? 'border-[rgb(239,68,68)]'
                                          : 'border-gray-500'
                                    }
                                    onValueChange={([value]) => {
                                      setAppUsage(prev => prev.map(a =>
                                        a.name === app.name ? { ...a, rating: value as ActivityRating } : a
                                      ))
                                    }}
                                    className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:bg-background"
                                  />
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {Math.floor(app.timeSpent / 60)}h {app.timeSpent % 60}m
                        </span>
                      </div>
                      <Progress
                        value={(app.timeSpent / (6 * 60)) * 100}
                        className={
                          app.rating >= 4
                            ? 'bg-[rgb(124,58,237)]/20 [&>div]:bg-[rgb(124,58,237)]' :
                            app.rating <= 2
                              ? 'bg-[rgb(239,68,68)]/20 [&>div]:bg-[rgb(239,68,68)]' :
                              'bg-gray-500/20 [&>div]:bg-gray-500'
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
