import { TrayIcon } from '@tauri-apps/api/tray'
import { Window } from '@tauri-apps/api/window'
import { Menu } from '@tauri-apps/api/menu'
import { resolveResource } from '@tauri-apps/api/path'
import { DateTime, Duration } from 'luxon'
import { useFlowTimer } from './stores/flowTimer'
import { invoke } from '@tauri-apps/api/core'
import { Image } from '@tauri-apps/api/image'

async function showAndFocusWindow() {
  const mainWindow = Window.getCurrent()
  await mainWindow.show()
  await mainWindow.unminimize()
  await mainWindow.setFocus()
  return mainWindow
}

let timerInterval: NodeJS.Timeout | null = null

const getIconPath = async () => {
  const isDev = import.meta.env.DEV
  const resolvedIconPath = await resolveResource('icons/tray.png')
  return isDev ? 'icons/tray.png' : resolvedIconPath
}

export const startFlowTimer = async (startTime: DateTime) => {
  const tray = await TrayIcon.getById('main-tray')
  if (timerInterval) {
    clearInterval(timerInterval)
  }

  if (!tray) return
  await tray.setTitle('')
  await tray.setIconAsTemplate(false)

  timerInterval = setInterval(async () => {
    const currentTotalDuration = useFlowTimer.getState().totalDuration
    console.log(`[Tray Timer Tick] totalDuration from store: ${currentTotalDuration?.as('minutes')} mins`)

    if (!currentTotalDuration) {
      console.warn('[Tray Timer] No totalDuration set, stopping timer.')
      clearInterval(timerInterval!)
      timerInterval = null
      await stopFlowTimer()
      return
    }

    const localTotalDuration = currentTotalDuration

    const elapsedDuration = startTime.diffNow().negate()
    let remainingDuration = localTotalDuration.minus(elapsedDuration)

    if (remainingDuration.as('milliseconds') < 0) {
      remainingDuration = Duration.fromMillis(0)
    }

    const formattedTime = remainingDuration.toFormat('hh:mm:ss')
    const elapsedMs = elapsedDuration.as('milliseconds')
    const totalMs = localTotalDuration.as('milliseconds')

    console.log(`[Tray Timer Calc] elapsedMs: ${elapsedMs}, totalMs: ${totalMs}, remaining: ${formattedTime}`)

    try {
      const iconBytes = await invoke<Uint8Array>('generate_timer_icon', {
        timeString: formattedTime,
        currentMs: elapsedMs,
        totalMs: totalMs
      })
      const iconImage = await Image.fromBytes(iconBytes)
      await tray.setIcon(iconImage)
    } catch (error) {
      console.error('Error generating/setting timer icon:', error)
    }

    if (remainingDuration.as('milliseconds') <= 0) {
      clearInterval(timerInterval!)
      timerInterval = null
      await stopFlowTimer()
    }
  }, 1000)

  const originalClearInterval = window.clearInterval
  window.clearInterval = (id: string | number | NodeJS.Timeout | undefined) => {
    return originalClearInterval(id)
  }
}

export const stopFlowTimer = async () => {
  const tray = await TrayIcon.getById('main-tray')
  if (!tray) return

  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }

  const iconPath = await getIconPath()
  await tray.setIcon(iconPath)
  await tray.setIconAsTemplate(true)
  await tray.setTitle('')
}

export async function setupTray() {
    const existingTray = await TrayIcon.getById('main-tray')
    if (existingTray) {
      return existingTray
    }

    const iconPath = await getIconPath()
    const tray = await TrayIcon.new({
      id: 'main-tray',
      tooltip: 'Ebb',
      icon: iconPath,
      iconAsTemplate: true
    })

    const menu = await Menu.new({
      items: [
        {
          text: 'Show Dashboard',
          action: async () => {
            await showAndFocusWindow()
          }
        },
        { item: 'Separator' },
        {
          text: 'Quit',
          action: async () => {
            const window = Window.getCurrent()
            await window.close()
            await window.destroy()
          }
        }
      ]
    })

    await tray.setMenu(menu)
    return tray
}
