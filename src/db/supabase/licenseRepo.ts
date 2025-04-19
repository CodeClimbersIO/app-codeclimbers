import supabase from '../../lib/integrations/supabase'

const LicenseTable = 'license'

const getLicense = async (userId: string) => {
  return supabase
    .from(LicenseTable)
    .select('id, status, license_type, expiration_date')
    .eq('user_id', userId)
    .maybeSingle()
}

export const licenseRepo = {
  getLicense,
}
