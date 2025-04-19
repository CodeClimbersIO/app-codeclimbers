import Stripe from 'stripe'

let stripeClient: Stripe | null = null
const endpointSecret = Deno.env.get('__STRIPE_WEBHOOK_SECRET__') || ''

const getStripeClient = () => {
  if (!stripeClient) {  
    stripeClient = new Stripe(Deno.env.get('__STRIPE_SECRET_KEY__') || '', {
      apiVersion: '2025-03-31.basil',
      httpClient: Stripe.createFetchHttpClient()
    })
  }
  return stripeClient
}

export const StripeApi = {
  getStripeClient,
  endpointSecret,
}