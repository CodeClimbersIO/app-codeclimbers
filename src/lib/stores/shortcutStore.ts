import { create } from 'zustand'
import { loadShortcut } from '@/api/ebbApi/shortcutApi'

interface ShortcutState {
  shortcutParts: string[]
  setShortcutParts: (parts: string[]) => void
  loadShortcutFromStorage: () => Promise<void>
}

export const useShortcutStore = create<ShortcutState>((set) => ({
  shortcutParts: ['⌘', 'E'],
  setShortcutParts: (parts) => set({ shortcutParts: parts }),
  loadShortcutFromStorage: async () => {
    const shortcut = await loadShortcut()
    const parts = shortcut.split('+')
    const displayParts = parts.map(part => {
      if (part === 'CommandOrControl') return '⌘'
      if (part === 'Control') return '⌃'
      if (part === 'Option') return '⌥'
      if (part === 'Shift') return '⇧'
      if (part === 'ENTER') return '↵'
      if (part === 'SPACE') return '⎵'
      return part
    })
    set({ shortcutParts: displayParts })
  }
})) 
