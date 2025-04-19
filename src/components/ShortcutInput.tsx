import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Hotkey } from '@/components/ui/hotkey'
import { X, Check } from 'lucide-react'
import {
  updateGlobalShortcut,
  loadShortcut as loadInitialShortcut,
} from '../api/ebbApi/shortcutApi'
import { useShortcutStore } from '@/lib/stores/shortcutStore'
import { error as logError } from '@tauri-apps/plugin-log'

type ModifierKey = '⌘' | '⌥' | '⌃' | '⇧'

const modifierMap: Record<ModifierKey, string> = {
  '⌘': 'CommandOrControl',
  '⌃': 'Control',
  '⌥': 'Option',
  '⇧': 'Shift'
}

const keyCodeMap: Record<string, string> = {
  'Space': 'SPACE',
  'Enter': 'ENTER'
}

interface ShortcutInputProps {
  popoverAlign?: 'center' | 'start' | 'end'
}

type KeySnapshot = {
  modifiers: ModifierKey[]
  key: string | null
  isClosing: boolean
}

export function ShortcutInput({ popoverAlign = 'center' }: ShortcutInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeModifiers, setActiveModifiers] = useState<ModifierKey[]>([])
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [currentShortcut, setCurrentShortcut] = useState('')
  const [recordingOpacity, setRecordingOpacity] = useState(1)
  const [snapshot, setSnapshot] = useState<KeySnapshot | null>(null)
  const loadShortcutFromStore = useShortcutStore((state) => state.loadShortcutFromStorage)

  useEffect(() => {
    const loadAndSetShortcut = async () => {
      try {
        const initialShortcut = await loadInitialShortcut()
        setCurrentShortcut(initialShortcut)
        await loadShortcutFromStore()
      } catch (error) {
        logError(`Failed to load initial shortcut: ${error}`)
      }
    }
    void loadAndSetShortcut()
  }, [loadShortcutFromStore])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      if (!snapshot?.isClosing) {
        setActiveModifiers([])
        setActiveKey(null)
      }
    } else {
      setRecordingOpacity(1)
      setSnapshot(null)
      setActiveModifiers([])
      setActiveKey(null)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      e.preventDefault()

      const currentModifiers: ModifierKey[] = []
      if (e.metaKey) currentModifiers.push('⌘')
      if (e.ctrlKey) currentModifiers.push('⌃')
      if (e.altKey) currentModifiers.push('⌥')
      if (e.shiftKey) currentModifiers.push('⇧')

      setActiveModifiers(currentModifiers)

      let unmodifiedKey = e.key.toUpperCase()

      if (e.code.startsWith('Digit')) {
        unmodifiedKey = e.code.replace('Digit', '')
      } else if (e.code.startsWith('Key')) {
        unmodifiedKey = e.code.replace('Key', '')
      } else if (keyCodeMap[e.key]) {
        unmodifiedKey = keyCodeMap[e.key]
      } else if (e.key === ' ') {
         unmodifiedKey = 'SPACE'
      }

      if (keyCodeMap[unmodifiedKey]) {
        unmodifiedKey = keyCodeMap[unmodifiedKey]
      } else {
        unmodifiedKey = unmodifiedKey.replace('Key', '').replace('Digit', '')
      }

      if (unmodifiedKey.length === 1 || Object.values(keyCodeMap).includes(unmodifiedKey)) {
        if (currentModifiers.length === 0) {
          setActiveKey(unmodifiedKey)
          return
        }
        setActiveKey(unmodifiedKey)

        const updateShortcut = async () => {
          const newShortcut = [...currentModifiers.map(m => modifierMap[m]), unmodifiedKey].join('+')
          try {
            setRecordingOpacity(0)
            setSnapshot({ modifiers: currentModifiers, key: unmodifiedKey, isClosing: true })
            await updateGlobalShortcut(newShortcut)
            setCurrentShortcut(newShortcut)
            await loadShortcutFromStore()
            
            setTimeout(() => {
              setIsOpen(false)
              setSnapshot(null)
              setActiveModifiers([])
              setActiveKey(null)
            }, 500)
          } catch (error) {
            logError(`Failed to update shortcut in ShortcutInput: ${error}`)
            setActiveKey(null)
            setActiveModifiers([])
            setSnapshot(null)
          }
        }
        void updateShortcut()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isOpen || snapshot?.isClosing) return

      const currentModifiers: ModifierKey[] = []
      if (e.metaKey) currentModifiers.push('⌘')
      if (e.ctrlKey) currentModifiers.push('⌃')
      if (e.altKey) currentModifiers.push('⌥')
      if (e.shiftKey) currentModifiers.push('⇧')

      if (currentModifiers.length === 0) {
        setActiveModifiers([])
        setActiveKey(null)
      } else {
        setActiveModifiers(currentModifiers)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isOpen, loadShortcutFromStore, snapshot])

  const handleClearShortcut = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await updateGlobalShortcut('')
      setCurrentShortcut('')
      await loadShortcutFromStore()
    } catch (error) {
      logError(`Failed to clear shortcut: ${error}`)
    }
  }

  const renderHotkeyPart = (part: string) => {
    const content = part === 'CommandOrControl' ? '⌘' : 
                   part === 'Control' ? '⌃' :
                   part === 'Option' ? '⌥' :
                   part === 'Shift' ? '⇧' :
                   part === 'ENTER' ? '↵' :
                   part === 'SPACE' ? '⎵' : part
    return <Hotkey size="lg">{content}</Hotkey>
  }

  const displayModifiers = snapshot?.isClosing ? snapshot.modifiers : activeModifiers
  const displayKey = snapshot?.isClosing ? snapshot.key : activeKey
  const formattedDisplayKey = displayKey === 'SPACE' ? '⎵' : 
                             displayKey === 'ENTER' ? '↵' : 
                             displayKey

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button 
          variant='outline' 
          className='min-w-[140px] h-12 text-lg font-mono flex items-center gap-2 group relative'
        >
          {currentShortcut ? (
            <>
              {currentShortcut.split('+').map((part, index) => (
                <span key={index}>{renderHotkeyPart(part)}</span>
              ))}
              <div 
                onClick={handleClearShortcut}
                className='absolute right-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity'
              >
                <X className='h-4 w-4' />
              </div>
            </>
          ) : (
            <span className='text-muted-foreground text-sm'>Click to set</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-64 relative' align={popoverAlign}>
        {snapshot?.isClosing && (
          <div className='absolute top-3 right-3 transition-all duration-300 animate-in fade-in-0 scale-in-0'>
            <div className='rounded-full bg-green-500/10 p-1'>
              <Check className='w-4 h-4 text-green-500' strokeWidth={3} />
            </div>
          </div>
        )}
        <div className='flex flex-col gap-4'>
          <div className='min-h-[88px] flex flex-col justify-center'>
            {displayModifiers.length === 0 && !displayKey && (
              <>
                <div className='text-center font-medium transition-opacity duration-300' style={{ opacity: recordingOpacity }}>
                  Recording...
                </div>
                <div className='flex justify-center items-center gap-2 text-muted-foreground mt-4 transition-opacity duration-300' style={{ opacity: recordingOpacity }}>
                  {(['⌘', '⌃', '⌥', '⇧'] as ModifierKey[]).map((key) => (
                    <Hotkey key={key} variant='unselected'>{key}</Hotkey>
                  ))}
                </div>
              </>
            )}
            <div className='flex flex-col items-center gap-2'>
              <div className='flex justify-center items-center gap-2'>
                {displayModifiers.map((modifier, i) => (
                  <span key={i}>
                    {i > 0 && ' + '}
                    <Hotkey size='lg'>{modifier}</Hotkey>
                  </span>
                ))}
                {displayKey && displayModifiers.length > 0 && (
                  <>
                    <span>+</span>
                    <Hotkey size='lg'>{formattedDisplayKey}</Hotkey>
                  </>
                )}
                {displayKey && displayModifiers.length === 0 && (
                  <Hotkey size='lg'>{formattedDisplayKey}</Hotkey>
                )}
              </div>
              {displayKey && displayModifiers.length === 0 && (
                <div className='text-sm text-center text-red-400 mt-2'>
                  Begin with modifier: command, control, option, or shift
                </div>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
} 
