import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PaywallDialog } from '@/components/PaywallDialog'
import { GoogleIcon } from '@/components/icons/GoogleIcon'
import { LogOut, KeyRound } from 'lucide-react'
import { format } from 'date-fns'
import { User } from '@supabase/supabase-js'
import supabase from '@/lib/integrations/supabase'
import { error as logError } from '@tauri-apps/plugin-log'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'
import { useLicenseStore } from '@/stores/licenseStore'


interface UserProfileSettingsProps {
  user: User | null
}

export function UserProfileSettings({ user }: UserProfileSettingsProps) {
  const { hasProAccess } = usePermissions()
  const { isLoading, license } = useLicenseStore()

  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    const { error } = await logout()
    if (error) {
      logError(`Error logging out: ${error.message}`)
      return
    }

    navigate('/login')
  }

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { return_url: window.location.href },
      })
      if (error) throw error
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logError(`Error creating portal session: ${message}`)
    }
  }

  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback>
                {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -left-1 bg-background p-0.5 rounded-full">
              {isLoading ? (
                <KeyRound className="h-5 w-5 text-muted-foreground animate-pulse" />
              ) : hasProAccess ? (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <KeyRound className="h-5 w-5 text-yellow-500 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Status: {license?.status}</p>
                      {license?.licenseType && <p>Type: {license.licenseType}</p>}
                      {license?.expirationDate && <p>Updates until: {format(new Date(license.expirationDate), 'PP')}</p>}
                      {license?.licenseType === 'subscription' && (
                        <Button size="sm" variant="outline" onClick={handleManageSubscription} className="mt-2 w-full">Manage Subscription</Button>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <PaywallDialog>
                  <KeyRound className="h-5 w-5 text-muted-foreground hover:text-yellow-500 cursor-pointer" />
                </PaywallDialog>
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
            </h2>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>{user?.email}</span>
              <GoogleIcon className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
             Logout
          </Button>
        </div>
      </div>
    </div>
  )
} 
