// In Supabase make sure enfore JWT verification is disabled. It will auto-enable it each time you deploy an update from the CLI.
import Stripe from 'stripe'
import { licenseRepo, License } from '@shared/licenseSupabase.ts'
import { StripeApi } from '@shared/stripe.ts'

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      console.error('Webhook Error: No signature header received.')
      return new Response('No signature', { status: 400 })
    }

    const body = await req.text()
    let event: Stripe.Event
    try {
      event = await StripeApi.getStripeClient().webhooks.constructEventAsync(body, signature, StripeApi.endpointSecret)
    } catch (err) {
      console.error(`⚠️  Webhook signature verification failed: ${(err as Error).message}`)
      return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = session.customer as string
        const userId = session.client_reference_id 

        if (!userId) {
          console.error('Webhook Error: No user ID (client_reference_id) found in checkout session.')
          throw new Error('No user ID found in session')
        }

        if (session.mode === 'payment') {
          const ONE_YEAR_IN_MS = 365 * 24 * 60 * 60 * 1000
          const expirationDate = new Date(Date.now() + ONE_YEAR_IN_MS)

          const license: License = {
            user_id: userId,
            status: 'active',
            license_type: 'perpetual',
            purchase_date: new Date().toISOString(),
            expiration_date: expirationDate.toISOString(),
            stripe_customer_id: customerId,
            stripe_payment_id: session.payment_intent as string
          }

          const { error: licenseError } = await licenseRepo.upsertLicense(license)

          if (licenseError) {
            console.error('Supabase upsert error (perpetual):', licenseError)
            throw licenseError
          }
        }
        break
      }
      // Note: Subscription creation handled by customer.subscription.created/updated
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        let userId: string | null | undefined = subscription.metadata?.user_id

        // Fallback: Retrieve customer if metadata isn't directly on subscription event
        if (!userId) {
          try {
            const customer = await StripeApi.getStripeClient().customers.retrieve(customerId) as Stripe.Customer
            if (customer.deleted) {
              console.warn(`Customer ${customerId} is deleted. Cannot retrieve user_id.`)
            } else {
              userId = customer.metadata?.user_id
            }
          } catch (custError) {
            console.error(`Failed to retrieve Stripe customer ${customerId}:`, custError)
          }
        }

        if (!userId) {
          console.error(`Webhook Error: No user ID found in subscription metadata or retrieved customer for customer ID: ${customerId}`)
          throw new Error('No user ID found for subscription')
        }

        const status = subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : 'expired'
        const expirationDate = new Date(subscription.current_period_end * 1000)
        const purchaseDate = new Date(subscription.start_date * 1000)

        const license: License = {
          user_id: userId,
          status: status,
          license_type: 'subscription',
          purchase_date: purchaseDate.toISOString(),
          expiration_date: expirationDate.toISOString(),
          stripe_customer_id: customerId,
          stripe_payment_id: subscription.id,
        }

        const { error: licenseError } = await licenseRepo.upsertLicense(license)

        if (licenseError) {
          console.error('Supabase upsert error (subscription):', licenseError)
          throw licenseError
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        const { error: updateError } = await licenseRepo.updateLicense(subscription.id, 'expired')

        if (updateError) {
          console.error('Supabase update error (sub deleted):', updateError)
          console.warn(`Failed to update license status for deleted subscription ${subscription.id}. Maybe it didn't exist?`)
        }
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Webhook processing error:', err)
    const errorMessage = (err instanceof Error) ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: { message: errorMessage } }),
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}) 
