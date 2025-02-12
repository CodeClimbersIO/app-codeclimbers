import { Layout } from '@/components/Layout'
import { ModeToggle } from '@/components/ModeToggle'
import { Switch } from '@/components/ui/switch'
import { useSettings } from '../hooks/useSettings'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { SpotifyIcon } from '@/components/icons/SpotifyIcon'
import { AppleMusicIcon } from '@/components/icons/AppleMusicIcon'

export const SettingsPage = () => {
  const { showZeroState, toggleZeroState } = useSettings()
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false)
  const [activeService, setActiveService] = useState<'spotify' | 'apple' | null>('spotify') // Just for demo
  const [serviceToUnlink, setServiceToUnlink] = useState<'spotify' | 'apple' | null>(null)

  const handleUnlink = (service: 'spotify' | 'apple') => {
    setServiceToUnlink(service)
    setShowUnlinkDialog(true)
  }

  const confirmUnlink = () => {
    setActiveService(null)
    setShowUnlinkDialog(false)
  }

  return (
    <TooltipProvider>
      <Layout>
        <div className="p-8">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-semibold mb-8">Settings</h1>

            <div className="space-y-8">
              <div className="border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Appearance</h2>
                <div className="flex items-center justify-between">
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
              </div>

              <div className="border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Developer Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Show Zero State</div>
                      <div className="text-sm text-muted-foreground">
                        Toggle zero state UI for testing
                      </div>
                    </div>
                    <Switch
                      checked={showZeroState}
                      onCheckedChange={toggleZeroState}
                    />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Integrations</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <SpotifyIcon />
                      <div className="flex items-center gap-2">
                        <div className="font-medium">Spotify</div>
                        {activeService === 'spotify' && (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="text-sm text-muted-foreground">Linked</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      {activeService === 'spotify' ? (
                        <Button variant="ghost" size="sm" onClick={() => handleUnlink('spotify')}>
                          Unlink
                        </Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={activeService === 'apple'}
                                onClick={() => setActiveService('spotify')}
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
                        <Button variant="ghost" size="sm" onClick={() => handleUnlink('apple')}>
                          Unlink
                        </Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={activeService === 'spotify'}
                                onClick={() => setActiveService('apple')}
                              >
                                Connect
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {activeService === 'spotify' && (
                            <TooltipContent>
                              <p>Only one music service can be connected at a time</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-12 flex justify-between text-sm text-muted-foreground/50">
              <div>Ebb Version 1.0.0</div>
              <div>Slop by Paul Hovley and Nathan Covey</div>
            </div>
          </div>
        </div>

        <Dialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unlink {serviceToUnlink} Account</DialogTitle>
              <DialogDescription>
                Are you sure you want to unlink your {serviceToUnlink} account? This will remove access to your music library.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUnlinkDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmUnlink}>
                Unlink Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </TooltipProvider>
  )
} 
