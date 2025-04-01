import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/tailwind.util'

export type Difficulty = 'easy' | 'medium' | 'hard' | null

interface DifficultySelectorProps {
  value: Difficulty
  onChange: (value: 'easy' | 'medium' | 'hard') => void
  className?: string
}

export function DifficultySelector({ value, onChange, className }: DifficultySelectorProps) {
  const difficulties = [
    { 
      value: 'easy', 
      label: 'Easy', 
      color: 'text-green-500',
      icon: '🌱',
      description: 'End session or snooze with no resistance'
    },
    { 
      value: 'medium', 
      label: 'Medium', 
      color: 'text-yellow-500',
      icon: '⚡️',
      description: 'Wait 3 sec before end session or snooze'
    },
    { 
      value: 'hard', 
      label: 'Hard', 
      color: 'text-red-500',
      icon: '🔒',
      description: 'Don\'t allow end session or snooze'
    }
  ] as const

  const mediumDifficulty = difficulties[1]
  const selectedDifficulty = difficulties.find(d => d.value === value) || mediumDifficulty

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-6 px-2 text-xs text-muted-foreground/80 hover:text-foreground',
            selectedDifficulty.color,
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Medium'}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[290px] p-1" 
        align="start" 
        sideOffset={4}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
          {difficulties.map((difficulty) => (
            <Button
              key={difficulty.value}
              variant={value === difficulty.value ? 'secondary' : 'ghost'}
              className={cn(
                'flex flex-col items-start h-auto px-2 py-1.5 text-sm gap-0.5',
                value === difficulty.value && difficulty.color
              )}
              onClick={(e) => {
                e.stopPropagation()
                onChange(difficulty.value)
              }}
            >
              <div className="flex items-center gap-2 w-full">
                <span className="w-4">{difficulty.icon}</span>
                <span>{difficulty.label}</span>
              </div>
              <span className="text-xs text-muted-foreground pl-6">
                {difficulty.description}
              </span>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
} 
