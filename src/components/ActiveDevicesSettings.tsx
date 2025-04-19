import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { hostname } from '@tauri-apps/plugin-os'
import { User } from '@supabase/supabase-js'
import { Laptop2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { invoke } from '@tauri-apps/api/core'
import { Skeleton } from '@/components/ui/skeleton'
import { error } from '@tauri-apps/plugin-log'
import { deviceApi } from '../api/ebbApi/deviceApi'

interface Device {
  id: string
  name: string
  created_at: string
  is_current: boolean
}

interface ActiveDevicesSettingsProps {
  user: User | null
  maxDevices: number
}

const cleanupHostname = (name: string): string => {
  return name
    .replace(/\.local$/, '')
    .replace(/-/g, ' ')
}

export function ActiveDevicesSettings({ user, maxDevices }: ActiveDevicesSettingsProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoadingDevices, setIsLoadingDevices] = useState(true)
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null)

  useEffect(() => {
    const getCurrentDeviceId = async () => {
      try {
        const macAddress = await invoke<string>('get_mac_address')
        setCurrentDeviceId(macAddress)
      } catch (err) {
        error(`Error getting MAC address: ${err}`)
        setCurrentDeviceId(null)
      }
    }
    getCurrentDeviceId()
  }, [])

  const fetchDevices = async () => {
    if (!user) {
      setIsLoadingDevices(false)
      setDevices([])
      return
    }

    let currentDeviceName: string | null = null

    try {
      setIsLoadingDevices(true)
      
      try {
        const rawHostname = await hostname()
        currentDeviceName = rawHostname ? cleanupHostname(rawHostname) : 'This Device'
      } catch (hostnameErr) {
        error(`Error getting hostname: ${hostnameErr}`)
        currentDeviceName = 'This Device'
      }
      
      const { data: devicesData, error: fetchError } = await deviceApi.getUserDevices(user.id)

      if (fetchError) {
        error(`Supabase error fetching devices: ${fetchError}`)
        throw fetchError
      }

      const allDevices = devicesData.map(d => ({
        id: d.device_id,
        name: d.device_name,
        created_at: d.created_at,
        is_current: d.device_id === currentDeviceId
      }))

      const sortedDevices = allDevices.sort((a, b) => {
        if (a.is_current) return -1
        if (b.is_current) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      setDevices(sortedDevices)
    } catch (err) {
      error(`Error in fetchDevices: ${err}`)
      if (currentDeviceId) {
        setDevices([{
          id: currentDeviceId,
          name: currentDeviceName || 'This Device',
          created_at: new Date().toISOString(),
          is_current: true
        }])
      } else {
        setDevices([])
      }
    } finally {
      setIsLoadingDevices(false)
    }
  }

  useEffect(() => {
    fetchDevices()
  }, [user?.id, currentDeviceId])

  const handleDeviceLogout = async (logoutDeviceId: string) => {
    try {
      if (logoutDeviceId === currentDeviceId) return
      if (!user) throw new Error('No user found')

      const { error: deleteError } = await deviceApi.logoutDevice(user.id, logoutDeviceId)

      if (deleteError) {
        error(`[Settings] Failed to delete device: ${deleteError}`)
        throw deleteError
      }

      window.location.reload()

    } catch (err) {
      error(`[Settings] Error logging out device: ${err}`)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Active Devices</h2>
        <div className="text-sm text-muted-foreground">
          {devices.length} of {maxDevices} device{maxDevices !== 1 ? 's' : ''}
        </div>
      </div>
      {isLoadingDevices ? (
        <Skeleton className="h-14 w-full rounded-lg" />
      ) : (
        <div className="space-y-3">
          {devices.map((device) => (
            <div 
              key={device.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${device.is_current ? 'bg-muted/50 border-muted-foreground/20' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="text-muted-foreground">
                  <Laptop2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {device.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Added: {formatDistanceToNow(new Date(device.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {device.is_current ? (
                  <Badge variant="outline" className="text-xs">
                    This Device
                  </Badge>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeviceLogout(device.id)}
                  >
                    Deactivate
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 
