import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import supabase from '@/lib/integrations/supabase'
import { invoke } from '@tauri-apps/api/core'
import { OnboardingUtils } from '@/lib/utils/onboarding'
import { error as logError } from '@tauri-apps/plugin-log'
import { isDev } from '../lib/utils/environment'

export const LoginPage = () => {
  const [error, setError] = useState('')

  useEffect(() => {
    OnboardingUtils.resetOnboarding()
  }, [])

  const handleGoogleLogin = async () => {
    try {
      const { data } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true,
          redirectTo: isDev()
            ? 'http://localhost:1420/auth-success'
            : 'https://ebb.cool/auth-success',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })

      if (!data?.url) throw new Error('No auth URL returned')
      
      if (isDev()) {
        window.location.href = data.url
      } else {
        await invoke('plugin:shell|open', { path: data.url })
      }
    } catch (err) {
      setError('Failed to login with Google.')
      logError(`${err}`)
    }
  }

  const openLink = async (url: string) => {
    try {
      await invoke('plugin:shell|open', { path: url })
    } catch (err) {
      logError(`Failed to open link: ${err}`)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="mb-8">
        <Logo width={100} height={36} />
      </div>
      <p className="text-lg mb-8 text-muted-foreground">Focus starts here.</p>
      {error && <p className="text-sm text-destructive mb-4">{error}</p>}
      <Button 
        type="button" 
        variant="outline" 
        size="lg"
        iconSize={5}
        className="flex items-center justify-center gap-2 min-w-[240px]"
        onClick={handleGoogleLogin}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </Button>
      <div className="mt-6 max-w-[240px] w-full">
        <div className="h-px bg-border mb-6" />
        <p className="text-xs text-muted-foreground/80 text-center">
          By continuing with Google, you agree to our{' '}
          <button 
            onClick={() => openLink('https://ebb.cool/terms')}
            className="text-blue-500 hover:underline dark:text-blue-400"
          >
            Terms of Use
          </button>{' '}
          and{' '}
          <button 
            onClick={() => openLink('https://ebb.cool/privacy')}
            className="text-blue-500 hover:underline dark:text-blue-400"
          >
            Privacy Policy
          </button>
        </p>
      </div>
    </div>
  )
}
