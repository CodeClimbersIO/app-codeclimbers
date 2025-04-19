import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/tailwind.util'
import { DifficultyButton } from './DifficultyButton'
import { SignalBars } from './SignalBars'
import { Difficulty, DifficultyOption, DifficultyValue } from './types'

interface DifficultySelectorProps {
  value: Difficulty
  onChange: (value: DifficultyValue) => void
  className?: string
  disabledOptions?: DifficultyValue[]
}

export function DifficultySelector({ value, onChange, className, disabledOptions = [] }: DifficultySelectorProps) {
  const difficulties: DifficultyOption[] = [
    { 
      value: 'easy', 
      label: 'Easy', 
      color: 'text-green-500',
      description: 'End session or snooze with no resistance',
      level: 1
    },
    { 
      value: 'medium', 
      label: 'Medium', 
      color: 'text-yellow-500',
      description: 'Wait 3 sec before end session or snooze',
      level: 2
    },
    { 
      value: 'hard', 
      label: 'Hard', 
      color: 'text-red-500',
      description: 'No end session or snooze',
      level: 3
    }
  ]

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
          <SignalBars level={selectedDifficulty.level} />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[290px] p-1" 
        align="start" 
        sideOffset={4}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
          {difficulties.map((difficulty) => {
            const isDisabled = disabledOptions.includes(difficulty.value)
            return (
              <DifficultyButton
                key={difficulty.value}
                difficulty={difficulty}
                isSelected={value === difficulty.value}
                isDisabled={isDisabled}
                onChange={onChange}
              />
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
} 
