import { create } from 'zustand'
import supabase from '@/lib/integrations/supabase'
import { subscribeWithSelector } from 'zustand/middleware'
import { RealtimeChannel } from '@supabase/supabase-js'
import { error as logError } from '@tauri-apps/plugin-log'
import { defaultPermissions, License, licenseApi, LicensePermissions } from '@/api/ebbApi/licenseApi'
import { DeviceInfo, defaultDeviceInfo } from '@/api/ebbApi/deviceApi'

interface LicenseStoreState {
  license: License | null
  permissions: LicensePermissions
  deviceInfo: DeviceInfo
  isLoading: boolean
  error: Error | null
  channel: RealtimeChannel | null
  fetchLicense: (userId: string | null) => Promise<void>
  initSubscription: (userId: string) => void
  clearSubscription: () => Promise<void>
}

const defaultStoreState = {
  license: null,
  permissions: defaultPermissions,
  deviceInfo: defaultDeviceInfo,
  isLoading: true,
  error: null,
  channel: null,
}

export const useLicenseStore = create<LicenseStoreState>()(
  subscribeWithSelector(
    (set, get) => ({
      ...defaultStoreState,

      fetchLicense: async (userId: string | null) => {
        if (!userId) {
          set({ ...defaultStoreState, isLoading: false })
          return
        }
          
          
        try {
          set({ isLoading: true})
          const {data, error} = await licenseApi.getLicenseInfo(userId)

          if (error) {
            throw error
          }

          set({ ...defaultStoreState, license: data.license, permissions: data.permissions, deviceInfo: data.deviceInfo, isLoading: false })
        } catch (err) {
          logError(`Failed to fetch license status: ${err instanceof Error ? err.message : String(err)}`)
          set({ ...defaultStoreState, error: err instanceof Error ? err : new Error('Failed to fetch license') })
        }
      },

      initSubscription: (userId: string) => {
        if (get().channel) {
          return
        }

        const channel = supabase
          .channel(`license-updates-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'license',
              filter: `user_id=eq.${userId}`,
            },
            () => {
              get().fetchLicense(userId)
            }
          )
          .subscribe((status, err) => {
            if (status === 'CHANNEL_ERROR') {
              logError(`Subscription error for user ${userId}: ${err}`)
              get().clearSubscription()
            } else if (status === 'TIMED_OUT') {
              logError(`Subscription timed out for user ${userId}.`)
              get().clearSubscription()
            }
          })

        set({ channel })
      },

      clearSubscription: async () => {
        const channel = get().channel
        if (channel) {
          try {
            await supabase.removeChannel(channel)
          } catch (error) {
            logError(`Error removing Supabase channel: ${error}`)
          } finally {
            set({ channel: null })
          }
        }
      },
    })
  )
)
