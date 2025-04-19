import { useState } from 'react'
import { TypeOutline, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { PaywallDialog } from '@/components/PaywallDialog'
import { usePermissions } from '@/hooks/usePermissions'

interface TypewriterModeToggleProps {
  typewriterMode: boolean
  onToggle: (value: boolean) => void
}

export function TypewriterModeToggle({ typewriterMode, onToggle }: TypewriterModeToggleProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const { canUseTypewriter } = usePermissions()

  return (
    <div>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <div
            onMouseEnter={() => setIsPopoverOpen(true)}
            onMouseLeave={() => setIsPopoverOpen(false)}
          >
            {canUseTypewriter ? (
              <Button
                variant="ghost"
                size="icon"
                className={`text-muted-foreground ${typewriterMode ? 'bg-transparent hover:bg-transparent' : ''}`}
                onClick={(e) => {
                  e.preventDefault()
                  onToggle(!typewriterMode)
                }}
              >
                <div className="relative">
                  <TypeOutline className="h-4 w-4" />
                  <div className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ${typewriterMode ? 'bg-green-600' : 'bg-muted'}`} />
                </div>
              </Button>
            ) : (
              <PaywallDialog>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                >
                  <div className="relative">
                    <TypeOutline className="h-4 w-4" />
                    <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-muted" />
                  </div>
                </Button>
              </PaywallDialog>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent side="top" align="center" className="w-56">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Typewriter Mode</p>
            {canUseTypewriter ? (
              <Badge variant={typewriterMode ? 'default' : 'secondary'} className={`text-xs px-1.5 py-0 ${typewriterMode ? 'bg-green-600' : ''}`}>
                {typewriterMode ? 'On' : 'Off'}
              </Badge>
            ) : (
              <KeyRound className="h-4 w-4 text-yellow-500" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">De-emphasize everything but the active window</p>
        </PopoverContent>
      </Popover>
    </div>
  )
} 
