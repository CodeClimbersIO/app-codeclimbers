'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { getFlowScoreColor } from '@/lib/utils/flow'
import { DateTime } from 'luxon'

interface FlowChartProps {
  data: { time: string; value: number; appSwitches?: number }[]
  flowScore: number
}

export function FlowChart({ data, flowScore }: FlowChartProps) {
  const color = getFlowScoreColor(flowScore)

  return (
    <ChartContainer
      className="h-full w-full"
      config={{
        value: {
          label: 'Flow Score',
          color: color
        },
        appSwitches: {
          label: 'App Switches',
          color: color
        }
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ left: 0, right: 0, top: 5, bottom: 5 }}
        >
          <defs>
            <linearGradient id={`flowGradient-${flowScore}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={color}
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor={color}
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
          <ChartTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null

              const data = payload[0].payload
              const time = DateTime.fromISO(data.time).toFormat('h:mm a')

              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="font-medium mb-2">{time}</div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-8">
                      <span className="text-muted-foreground">Flow Score</span>
                      <span className="font-medium">{data.value.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-8">
                      <span className="text-muted-foreground">App Switches</span>
                      <span className="font-medium">{data.appSwitches}</span>
                    </div>
                  </div>
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={`url(#flowGradient-${flowScore})`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
} 
