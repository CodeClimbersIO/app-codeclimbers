import {
  register as registerShortcutTauri,
  unregister as unregisterShortcutTauri
} from '@tauri-apps/plugin-global-shortcut'
import { emit } from '@tauri-apps/api/event'
import { error as logError, info as logInfo } from '@tauri-apps/plugin-log'
import { UserPreferenceRepo } from '@/db/ebb/userPreferenceRepo'

export const DEFAULT_SHORTCUT = 'CommandOrControl+E'
export const SHORTCUT_EVENT = 'global-shortcut-triggered'
const SHORTCUT_KEY = 'global-focus-shortcut'

let isInitialized = false

const getCurrentShortcutFromDb = async (): Promise<string> => {
  try {
    const savedShortcut = await UserPreferenceRepo.getPreference(SHORTCUT_KEY)
    return savedShortcut ?? ''
  } catch (err) {
    logError(`(Global) Failed to load shortcut from database: ${err}`)
    return ''
  }
}

export const loadShortcut = async (): Promise<string> => {
  return getCurrentShortcutFromDb()
}

const saveShortcut = async (shortcut: string): Promise<void> => {
  try {
    await UserPreferenceRepo.setPreference(SHORTCUT_KEY, shortcut)
  } catch (err) {
    logError(`(Global) Failed to save shortcut ${shortcut} to database: ${err}`)
  }
}

export const updateGlobalShortcut = async (newShortcut: string): Promise<void> => {
  if (!isInitialized) {
    logError('(Global) Cannot update shortcut before initialization')
    return
  }

  const currentShortcut = await getCurrentShortcutFromDb()
  if (newShortcut === currentShortcut) {
    return
  }

  try {
    if (currentShortcut) {
      await unregisterShortcutTauri(currentShortcut)
    }
    
    if (newShortcut) {
      await registerShortcutTauri(newShortcut, (event) => {
        if (event.state === 'Pressed') {
          emit(SHORTCUT_EVENT)
        }
      })
    }
    
    await saveShortcut(newShortcut)
  } catch (err) {
    logError(`(Global) Failed to update shortcut: ${err}`)
  }
}

export const initializeGlobalShortcut = async (): Promise<void> => {
  if (isInitialized) {
    return
  }

  try {
    const shortcutToRegister = await getCurrentShortcutFromDb()
    
    try {
      if (shortcutToRegister) {
        await unregisterShortcutTauri(shortcutToRegister)
      }
    } catch (err) {
      logError(`(Global) Failed to unregister existing shortcut during initialization: ${err}`)
    }

    if (shortcutToRegister) {
      await registerShortcutTauri(shortcutToRegister, (event) => {
        if (event.state === 'Pressed') {
          emit(SHORTCUT_EVENT)
        }
      })
      logInfo(`(Global) Initialized shortcut: ${shortcutToRegister}`)
    } else {
      logInfo('(Global) No shortcut found in DB during initialization.')
    }
    isInitialized = true
  } catch (err) {
    logError(`(Global) Failed to initialize shortcut: ${err}`)
    isInitialized = true
  }
}

export const getCurrentShortcut = async (): Promise<string> => {
  if (!isInitialized) {
    return ''
  }
  return getCurrentShortcutFromDb()
}

export const unregisterAllManagedShortcuts = async (): Promise<void> => {
  if (isInitialized) {
    const currentShortcut = await getCurrentShortcutFromDb()
    if (currentShortcut) {
      try {
        await unregisterShortcutTauri(currentShortcut)
      } catch (err) {
        logError(`(Global) Failed to unregister ${currentShortcut} during cleanup: ${err}`)
      }
    }
  }
  isInitialized = false
}
