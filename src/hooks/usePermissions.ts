import { useLicenseStore } from '@/stores/licenseStore'

export const usePermissions = () => {
  const { permissions } = useLicenseStore()

  return permissions
}

