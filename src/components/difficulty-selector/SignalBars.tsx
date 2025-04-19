import { cn } from '@/lib/utils/tailwind.util'

interface SignalBarsProps {
  level: 1 | 2 | 3
}

export function SignalBars({ level }: SignalBarsProps) {
  const bars = []
  const heights = ['h-2', 'h-3', 'h-4']
  const colors = ['bg-green-500', 'bg-yellow-500', 'bg-red-500']

  for (let i = 0; i < 3; i++) {
    bars.push(
      <div
        key={i}
        className={cn(
          'w-1 rounded-sm transition-colors',
          i < level ? colors[level - 1] : 'bg-muted',
          heights[i]
        )}
      />
    )
  }

  return (
    <div className="flex items-end gap-0.5 h-4">
      {bars}
    </div>
  )
} 
