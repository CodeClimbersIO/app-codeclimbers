import { error, info } from '@tauri-apps/plugin-log'
import { convertFileSrc } from '@tauri-apps/api/core'
import { resolveResource } from '@tauri-apps/api/path'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

interface NotificationOptions {
  duration?: number
  type: 'session-start' | 'session-end' | 'session-warning' | 'blocked-app'
}

class NotificationManager {
  private static instance: NotificationManager
  private notifications: WebviewWindow[] = []
  private readonly NOTIFICATION_HEIGHT = 100
  private readonly NOTIFICATION_WIDTH = 356

  private constructor() {}

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  private async getNotificationResources(type: NotificationOptions['type']) {
    try {
      const soundMap = {
        'session-start': 'session_start.mp3',
        'session-end': 'session_end.mp3',
        'session-warning': 'session_warning.mp3',
        'blocked-app': 'app_blocked.mp3'
      }

      const isDev = import.meta.env.DEV
      info(`Is development environment: ${isDev}`)

      let htmlPath
      let soundPath

      if (isDev) {
        // Development paths remain the same
        htmlPath = `/src-tauri/notifications/html/notification-${type}.html`
        soundPath = `/src-tauri/notifications/sounds/${soundMap[type]}`
      } else {
        // For both HTML and sound files, use resolveResource and convertFileSrc
        const htmlResourcePath = await resolveResource(`notifications/html/notification-${type}.html`)
        const soundResourcePath = await resolveResource(`notifications/sounds/${soundMap[type]}`)
        
        htmlPath = convertFileSrc(htmlResourcePath)
        soundPath = convertFileSrc(soundResourcePath)
      }
      
      info(`HTML path: ${htmlPath}`)
      info(`Sound path: ${soundPath}`)
      
      return { html: htmlPath, sound: soundPath }
    } catch (err) {
      error(`Error getting notification resources: ${err}`)
      throw err
    }
  }

  private async getNotificationUrl(type: NotificationOptions['type'], duration: number, animationDuration: number): Promise<string> {
    try {
      const resources = await this.getNotificationResources(type)
      const isDev = import.meta.env.DEV
      
      // Construct the URL - resources.html is now already a proper URL in both dev and prod
      const fullUrl = isDev ? `http://localhost:1420${resources.html}` : resources.html
      
      // Create URL object to add parameters
      const url = new URL(fullUrl)
      url.searchParams.set('duration', duration.toString())
      url.searchParams.set('animationDuration', animationDuration.toString())
      
      if (resources.sound) {
        const soundUrl = isDev ? `http://localhost:1420${resources.sound}` : resources.sound
        url.searchParams.set('sound', soundUrl)
        info(`Final sound URL after encoding: ${url.searchParams.get('sound')}`)
      } else {
        error('No sound URL available')
      }
      
      const finalUrl = url.toString()
      info(`Final notification URL: ${finalUrl}`)
      
      return finalUrl
    } catch (err) {
      error(`Error constructing notification URL: ${err}`)
      throw err
    }
  }

  public async show(options: NotificationOptions): Promise<void> {
    try {
      info(`Showing notification: ${JSON.stringify(options)}`)
      
      // Set different durations based on notification type
      let duration = 5000 // default 6s
      switch (options.type) {
        case 'session-warning':
          duration = 12000
          break
        case 'session-end':
          duration = 8000
          break
        case 'session-start':
          duration = 5000
          break
        case 'blocked-app':
          duration = 5000
          break
      }

      // Only override the duration if explicitly provided in options
      if (options.duration !== undefined) {
        duration = options.duration
      }

      const { type } = options
      const ANIMATION_DURATION = 500 // Animation duration in ms

      // Use the notification type as the label
      const label = type
      info(`Creating notification window: ${label}`)

      // Get the notification URL first
      const notificationUrl = await this.getNotificationUrl(type, duration, ANIMATION_DURATION)
      info(`Using notification URL: ${notificationUrl}`)

      // Create the WebviewWindow
      const webviewWindow = new WebviewWindow(label, {
        url: notificationUrl,
        width: this.NOTIFICATION_WIDTH,
        height: this.NOTIFICATION_HEIGHT,
        x: Math.round((screen.width - this.NOTIFICATION_WIDTH) / 2),
        y: 20,
        decorations: false,
        alwaysOnTop: true,
        focus: true,
        resizable: false,
        maximizable: false,
        minimizable: false,
        closable: false,
        skipTaskbar: true,
        titleBarStyle: 'transparent',
        hiddenTitle: true,
        transparent: true
      })

      // Add debug listeners
      webviewWindow.once('tauri://load-start', () => {
        info('Webview started loading')
      })

      webviewWindow.once('tauri://load-end', () => {
        info('Webview finished loading')
      })

      webviewWindow.once('tauri://error', (e) => {
        error(`Webview error: ${JSON.stringify(e)}`)
      })

      // Wait for the webview to be created
      await new Promise<void>((resolve, reject) => {
        webviewWindow.once('tauri://created', () => {
          info('Notification webview created successfully')
          this.notifications.push(webviewWindow)
          resolve()
        })
        
        webviewWindow.once('tauri://error', (event) => {
          error(`Error creating notification webview: ${JSON.stringify(event)}`)
          reject(new Error('Failed to create notification webview'))
        })
      })

      // Wait for the full duration plus exit animation
      await new Promise<void>((resolve) => {
        setTimeout(async () => {
          const index = this.notifications.indexOf(webviewWindow)
          if (index > -1) {
            this.notifications.splice(index, 1)
          }
          await webviewWindow.destroy()
          info('Notification window destroyed')
          resolve()
        }, duration + ANIMATION_DURATION)
      })

      info('Notification complete')
    } catch (err) {
      error(`Error showing notification: ${err}`)
      throw err
    }
  }
}

export default NotificationManager 
