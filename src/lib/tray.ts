import { TrayIcon } from '@tauri-apps/api/tray'
import { Window } from '@tauri-apps/api/window'
import { Menu } from '@tauri-apps/api/menu'

async function showAndFocusWindow() {
  const mainWindow = Window.getCurrent()
  await mainWindow.show()
  await mainWindow.unminimize()
  await mainWindow.setFocus()
  return mainWindow
}

export async function setupTray() {
  try {
    // Check if tray already exists
    const existingTray = await TrayIcon.getById('main-tray')
    if (existingTray) {
      return existingTray
    }

    // First create the tray
    const tray = await TrayIcon.new({
      id: 'main-tray',
      tooltip: 'Ebb',
      icon: 'icons/tray.png',
      iconAsTemplate: true  // For better macOS dark mode support
    })

    // Then create and set the menu
    const menu = await Menu.new({
      items: [
        {
          text: 'Start Focus Session',
          accelerator: 'CommandOrControl+E',
          action: async () => {
            const window = await showAndFocusWindow()
            await window.emit('navigate', '/start-flow')
          }
        },
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

    // Set the menu after creating it
    await tray.setMenu(menu)
    
    return tray
  } catch (error) {
    console.error('Failed to setup tray:', error)
    throw error
  }
}
