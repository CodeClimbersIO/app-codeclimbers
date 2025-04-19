import { Layout } from '@/components/Layout'
import { ModeToggle } from '@/components/ModeToggle'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { SpotifyIcon } from '@/components/icons/SpotifyIcon'
import { AppleMusicIcon } from '@/components/icons/AppleMusicIcon'
import { DiscordIcon } from '@/components/icons/DiscordIcon'
import { GithubIcon } from '@/components/icons/GithubIcon'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useNavigate } from 'react-router-dom'
import { SpotifyApiService } from '@/lib/integrations/spotify/spotifyApi'
import { SpotifyAuthService } from '@/lib/integrations/spotify/spotifyAuth'
import supabase from '@/lib/integrations/supabase'
import { ResetAppData } from '@/components/developer/ResetAppData'
import { version } from '../../package.json'
import { useAuth } from '@/hooks/useAuth'
import { invoke } from '@tauri-apps/api/core'
import { ShortcutInput } from '@/components/ShortcutInput'
import { Switch } from '@/components/ui/switch'
import { isEnabled } from '@tauri-apps/plugin-autostart'
import { error as logError } from '@tauri-apps/plugin-log'
import { ActiveDevicesSettings } from '@/components/ActiveDevicesSettings'
import { UserProfileSettings } from '@/components/UserProfileSettings'
import { userApi } from '@/api/ebbApi/userApi'
import { isDev } from '@/lib/utils/environment'
import { usePermissions } from '@/hooks/usePermissions'

export function SettingsPage() {
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false)
  const [activeService, setActiveService] = useState<'spotify' | 'apple' | null>(null)
  const [serviceToUnlink, setServiceToUnlink] = useState<'spotify' | 'apple' | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [autostartEnabled, setAutostartEnabled] = useState(false)
  const [spotifyProfile, setSpotifyProfile] = useState<{
    email: string;
    display_name: string | null;
    product?: string;
  } | null>(null)
  const navigate = useNavigate()
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { user } = useAuth()
  const { maxDevices } = usePermissions()


  useEffect(() => {
    const initializeSettings = async () => {
      setIsLoading(true)
      try {
        const hashParams = window.location.hash.replace('#', '')
        const searchParams = new URLSearchParams(window.location.search || hashParams.substring(hashParams.indexOf('?')))
        const code = searchParams.get('code')
        const state = searchParams.get('state')

        if (code && state) {
          await SpotifyAuthService.handleCallback(code, state)
          window.history.replaceState({}, '', '/settings')
        }

        const isConnected = await SpotifyAuthService.isConnected()
        if (isConnected) {
          const profile = await SpotifyApiService.getUserProfile()
          if (profile) {
            setSpotifyProfile(profile)
            setActiveService('spotify')
          }
        }
      } catch (error) {
        logError(`Error handling Spotify callback: ${error}`)
        setIsLoading(false)
      }

      if (window.location.hash === '#music-integrations') {
        const section = document.getElementById('music-integrations')
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' })
        }
      }
    }
    initializeSettings()
  }, [])

  useEffect(() => {
    const checkAutostart = async () => {
      const enabled = await isEnabled()
      setAutostartEnabled(enabled)
    }
    checkAutostart()
  }, [])

  const handleUnlink = (service: 'spotify' | 'apple') => {
    setServiceToUnlink(service)
    setShowUnlinkDialog(true)
  }

  const confirmUnlink = async () => {
    if (serviceToUnlink === 'spotify') {
      await SpotifyAuthService.disconnect()
      setSpotifyProfile(null)
    }
    setActiveService(null)
    setShowUnlinkDialog(false)
    setServiceToUnlink(null)
  }

  const handleSpotifyConnect = async () => {
    try {
      await SpotifyAuthService.connect()
    } catch (error) {
      logError(`Error connecting to Spotify: ${error}`)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true)
      await userApi.deleteAccount()

      await supabase.auth.signOut()
      navigate('/')
    } catch (error) {
      logError(`Error deleting account: ${error}`)
    } finally {
      setIsDeleting(false)
      setShowDeleteAccountDialog(false)
    }
  }

  const handleAutostartToggle = async () => {
    try {
      await invoke('change_autostart', { open: !autostartEnabled })
      setAutostartEnabled(!autostartEnabled)
    } catch (error) {
      logError(`Error toggling autostart: ${error}`)
    }
  }

  return (
    <Layout>
      <TooltipProvider>
        <div className="p-8">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-semibold mb-8">Settings</h1>

            <div className="space-y-8">
              <UserProfileSettings user={user} />

              <div className="border rounded-lg p-6">
                <ActiveDevicesSettings 
                  user={user} 
                  maxDevices={maxDevices} 
                />
              </div>

              <div className="border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">System</h2>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="font-medium">Theme</div>
                    <div className="text-sm text-muted-foreground">
                      Customize how Ebb looks on your device
                    </div>
                  </div>
                  <div className="relative">
                    <ModeToggle />
                  </div>
                </div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="font-medium">Global Shortcut</div>
                    <div className="text-sm text-muted-foreground">
                      Use this shortcut anywhere to start a focus session
                    </div>
                  </div>
                  <ShortcutInput popoverAlign="end" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Launch on Startup</div>
                    <div className="text-sm text-muted-foreground">
                      Automatically start Ebb when you log in to your computer
                    </div>
                  </div>
                  <Switch
                    checked={autostartEnabled}
                    onCheckedChange={handleAutostartToggle}
                  />
                </div>
              </div>

              <div id="music-integrations" className="border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Integrations</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <SpotifyIcon />
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">Spotify</div>
                          {spotifyProfile && (
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-green-500" />
                              <div className="text-sm text-muted-foreground">
                                {spotifyProfile.email}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      {activeService === 'spotify' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnlink('spotify')}
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={activeService === 'apple' || isLoading}
                                onClick={handleSpotifyConnect}
                              >
                                Connect
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {activeService === 'apple' && (
                            <TooltipContent>
                              <p>Only one music service can be connected at a time</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AppleMusicIcon />
                      <div className="flex items-center gap-2">
                        <div className="font-medium">Apple Music</div>
                        {activeService === 'apple' && (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="text-sm text-muted-foreground">Linked</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      {activeService === 'apple' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnlink('apple')}
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={true}
                              >
                                Coming Soon
                              </Button>
                            </span>
                          </TooltipTrigger>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Community</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-8">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Ebb is maintained by an open source community called CodeClimbers. Join us on Discord or GitHub to get involved.
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => invoke('plugin:shell|open', { path: 'https://discord.gg/qhST6C5XxV' })}
                        className="gap-2"
                      >
                        <DiscordIcon />
                        Discord
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => invoke('plugin:shell|open', { path: 'https://github.com/CodeClimbersIO/ebb-app' })}
                        className="gap-2"
                      >
                        <GithubIcon />
                        GitHub
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6 mt-8">
                <h2 className="text-lg font-semibold mb-4 text-red-500">Danger Zone</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-8">
                    <div>
                      <div className="font-medium">Delete Account</div>
                      <div className="text-sm text-muted-foreground">
                        Permanently delete your account, Ebb license, and cloud data. Local usage data will not be deleted.
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Button
                        variant="destructive"
                        onClick={() => setShowDeleteAccountDialog(true)}
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {isDev() && (
              <div className="mt-12 border-t pt-6">
                <h2 className="text-xl font-semibold mb-4">Developer Options</h2>
                <ResetAppData />
              </div>
            )}

            <div className="mt-12 flex justify-between text-sm text-muted-foreground/50">
              <div>Ebb Version {version}</div>
              <div className="flex items-center gap-2">
                <span>Slop by </span>
                <button 
                  onClick={() => invoke('plugin:shell|open', { path: 'https://x.com/PaulHovley' })}
                  className="hover:underline"
                >
                  Paul Hovley
                </button>
                <span>&</span>
                <button 
                  onClick={() => invoke('plugin:shell|open', { path: 'https://x.com/nathan_covey' })}
                  className="hover:underline"
                >
                  Nathan Covey
                </button>
                <span>•</span>
                <button 
                  onClick={() => invoke('plugin:shell|open', { path: 'https://ebb.cool/terms' })}
                  className="hover:underline"
                >
                  Terms
                </button>
                <span>•</span>
                <button 
                  onClick={() => invoke('plugin:shell|open', { path: 'https://ebb.cool/privacy' })}
                  className="hover:underline"
                >
                  Privacy
                </button>
              </div>
            </div>
          </div>
        </div>

        <Dialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disconnect {serviceToUnlink === 'spotify' ? 'Spotify' : 'Apple Music'}?</DialogTitle>
              <DialogDescription>
                This will remove access to your {serviceToUnlink === 'spotify' ? 'Spotify' : 'Apple Music'} account.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUnlinkDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmUnlink}>Disconnect</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Warning: Will Also Delete Your Ebb License</DialogTitle>
              <DialogDescription>
                This will permanently delete your account, your Ebb License, and remove all of your scoring and friends data from our servers. This action cannot be undone.  Your local usage data will remain.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteAccountDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </Layout>
  )
} 
