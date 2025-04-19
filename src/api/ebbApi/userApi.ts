import supabase from '@/lib/integrations/supabase'
import { getEnv } from '@/lib/utils/environment'

const env = getEnv()

const deleteDevice = async (userId: string, deviceId: string) => {
  const { error } = await supabase.from('devices').delete().match({
    user_id: userId,
    id: deviceId,
  })
  return { error }
}

const deleteAccount = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No session found')

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${env}-delete-account`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'x-client-info': 'codeclimbers'
      }
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete account')
  }
}

export const userApi = {
  deleteDevice,
  deleteAccount,
}

