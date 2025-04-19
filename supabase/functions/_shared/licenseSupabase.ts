import { createClient } from '@supabase/supabase-js'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)


export type License = {
  user_id: string
  status: 'active' | 'expired'
  license_type: 'perpetual' | 'subscription'
  purchase_date: string
  expiration_date: string
  stripe_customer_id: string
  stripe_payment_id: string
}

const upsertLicense = (license: License) => {
  return supabase
    .from('license')
    .upsert({
      user_id: license.user_id,
      status: license.status,
      license_type: license.license_type,
      purchase_date: license.purchase_date,
      expiration_date: license.expiration_date,
      stripe_customer_id: license.stripe_customer_id,
      stripe_payment_id: license.stripe_payment_id
    })
}

const updateLicense = (stripeSubscriptionId: string, status: License['status']) => {
  return supabase
    .from('license')
    .update({
      status,
    })
    .eq('stripe_subscription_id', stripeSubscriptionId)
}

export const licenseRepo = {
  upsertLicense,
  updateLicense,
}
