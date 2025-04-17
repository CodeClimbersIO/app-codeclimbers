// import { EbbProSettings } from '@/components/EbbProSettings'
import { ActiveDevicesSettings } from '@/components/ActiveDevicesSettings'
import { Layout } from '@/components/Layout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { PaywallDialog } from '@/components/PaywallDialog'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLicense } from '../hooks/useLicense'

interface DeviceLimitPageProps {
  onDeviceRemoved: () => void 
}

export function DeviceLimitPage({ onDeviceRemoved }: DeviceLimitPageProps) {
  const { user } = useAuth()
  const { canUseMultipleDevices, maxDevicesToShow } = useLicense()


  return (
    <Layout>
        <div className="p-8">
          <div className="max-w-5xl mx-auto">
             <Alert className="mb-8 border-yellow-500 text-yellow-600">
                <AlertCircle className="h-4 w-4 !text-yellow-600" />
                <AlertDescription>
                  {!canUseMultipleDevices ? (
                     <>
                       You have reached the max of 1 active device for free accounts.
                       Please deactivate an existing one or{' '}
                       <PaywallDialog>
                         <Button variant="link" className="p-0 h-auto text-yellow-700 underline font-semibold">upgrade to Ebb Pro</Button>
                       </PaywallDialog>{' '}
                       for up to 3 macOS devices.
                     </>
                  ) : (
                     <> 
                       You have reached the maximum number of active devices for your account.
                       Please deactivate an existing one to register this new one.
                     </>
                  )}
                </AlertDescription>
             </Alert>

             <div className="border rounded-lg p-6">
                <ActiveDevicesSettings 
                    user={user} 
                    maxDevicesToShow={maxDevicesToShow} 
                    onDeviceRemoved={onDeviceRemoved} 
                 />
             </div>
             
          </div>
        </div>
    </Layout>
  )
} 
