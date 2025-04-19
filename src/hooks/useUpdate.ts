import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { info } from '@tauri-apps/plugin-log'
import { FlowSessionApi } from '../api/ebbApi/flowSessionApi'
import { isDev } from '../lib/utils/environment'

export const checkAndUpdate = async () => {
  const flowSession = await FlowSessionApi.getInProgressFlowSession()
  if (flowSession) return // don't update if flow is in progress
  
  const update = await check()
  if (update) {
    info(
      `found update ${update.version} from ${update.date} with notes ${update.body}`
    )
    let downloaded = 0
    let contentLength = 0
    await update.downloadAndInstall((event) => {
      switch (event.event) {
      case 'Started':
        contentLength = event.data.contentLength ?? 0
        info(`started downloading ${event.data.contentLength} bytes`)
        break
      case 'Progress':
        downloaded += event.data.chunkLength
        info(`downloaded ${downloaded} from ${contentLength}`)
        break
      case 'Finished':
        info('download finished')
        break
      }
    })

    info('update installed')
    await relaunch()
  }
}

export const useUpdate = () => {
  const beginCheckForUpdates = () => {
    if (isDev()) return
    
    checkAndUpdate()
    const interval = setInterval(checkAndUpdate, 60 * 1000)
    return () => clearInterval(interval)
  }
  return {
    beginCheckForUpdates,
  }
}
