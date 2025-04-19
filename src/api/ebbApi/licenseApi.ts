import { PostgrestError } from '@supabase/supabase-js'
import { licenseRepo } from '../../db/supabase/licenseRepo'
import { deviceApi, DeviceInfo } from './deviceApi'

export type LicenseStatus = 'active' | 'expired'
export type LicenseType = 'perpetual' | 'subscription'
export interface RawLicense {
  id: string
  status: string
  license_type: 'perpetual' | 'subscription'
  expiration_date: string | null
}
export interface License {
  id: string
  userId: string
  status: LicenseStatus
  licenseType: LicenseType
  purchaseDate: Date
  expirationDate: Date
  stripeCustomerId?: string
  stripePaymentId?: string
  createdAt: Date
  updatedAt: Date
}

export interface LicenseDevice {
  id: string
  licenseId: string
  deviceId: string
  deviceName: string
  createdAt: Date
}

export interface LicensePermissions {
  canUseHardDifficulty: boolean
  canUseAllowList: boolean
  canUseTypewriter: boolean
  canUseMultipleProfiles: boolean
  canUseMultipleDevices: boolean
  hasProAccess: boolean
  maxDevices: number
  isUpdateEligible: boolean
}

export type LicenseInfo = {
  license: License | null
  permissions: LicensePermissions
  deviceInfo: DeviceInfo
}

export const defaultPermissions: LicensePermissions = {
  canUseHardDifficulty: false,
  canUseAllowList: false,
  canUseTypewriter: false,
  canUseMultipleProfiles: false,
  canUseMultipleDevices: false,
  hasProAccess: false,
  maxDevices: 1,
  isUpdateEligible: false,
}

const transformLicense = (rawLicense: RawLicense | null): License | null => {
  if (!rawLicense) return null
  return {
    id: rawLicense.id,
    userId: '',
    status: rawLicense.status as 'active' | 'expired',
    licenseType: rawLicense.license_type,
    purchaseDate: new Date(),
    expirationDate: rawLicense.expiration_date ? new Date(rawLicense.expiration_date) : new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    stripeCustomerId: undefined,
    stripePaymentId: undefined,
  }
}

const calculatePermissions = (license: License | null): LicensePermissions | null => {
  if (!license) return null
  const hasProAccess = license?.status === 'active'

  const isUpdateEligible = hasProAccess && license && (
    license.licenseType === 'subscription' ||
    (license.licenseType === 'perpetual' &&
      !!license.expirationDate &&
      license.expirationDate > new Date()
    )
  )

  return {
    canUseHardDifficulty: hasProAccess,
    canUseAllowList: hasProAccess,
    canUseTypewriter: hasProAccess,
    canUseMultipleProfiles: hasProAccess,
    canUseMultipleDevices: hasProAccess,
    hasProAccess,
    maxDevices: hasProAccess ? 3 : 1,
    isUpdateEligible,
  }
}

const getLicenseInfo = async (userId: string): Promise<{data: LicenseInfo, error: PostgrestError | null}> => {
  const {data, error} = await licenseRepo.getLicense(userId)
  const license = transformLicense(data)
  const permissions = calculatePermissions(license) || defaultPermissions
  const deviceInfo = await deviceApi.registerDevice(userId, permissions.maxDevices)
  return {data: {license, permissions, deviceInfo }, error}
}


export const licenseApi = {
  getLicenseInfo,
  calculatePermissions,
}

