import Database from '@tauri-apps/plugin-sql'
import { homeDir, join } from '@tauri-apps/api/path'

let ebbDb: Database | null = null

export const getEbbDb = async () => {
  if (ebbDb) {
    return ebbDb
  }
  const homeDirectory = await homeDir()
  const ebbDbPath = await join(homeDirectory, '.ebb', 'ebb-desktop-new.sqlite')
  ebbDb = await Database.load(`sqlite:${ebbDbPath}`)
  return ebbDb
}
