import Database from '@tauri-apps/plugin-sql'
import { homeDir, join } from '@tauri-apps/api/path'

let monitorDb: Database | null = null

const getMonitorDb = async () => {
  if (monitorDb) {
    return monitorDb
  }

  const homeDirectory = await homeDir()
  const monitorDbPath = await join(
    homeDirectory,
    '.codeclimbers',
    'codeclimbers-desktop-new.sqlite',
  )
  monitorDb = await Database.load(`sqlite:${monitorDbPath}`)
  return monitorDb
}

export const MonitorDb = {
  getMonitorDb,
}
