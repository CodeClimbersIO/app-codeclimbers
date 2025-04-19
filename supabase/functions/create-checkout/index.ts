import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '@shared/cors.ts'
import { StripeApi } from '@shared/stripe.ts'
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      console.error('Supabase user error:', userError)
      throw new Error('Unauthorized')
    }

    const { data: existingLicense } = await supabase
      .from('license')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (existingLicense) {
      throw new Error('User already has an active license')
    }

    const { licenseType } = await req.json()
    if (!licenseType || !['perpetual', 'subscription'].includes(licenseType)) {
      throw new Error('Invalid license type')
    }

    const session = await StripeApi.getStripeClient().checkout.sessions.create({
      payment_method_types: [
        'card',
        'link'
      ],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: licenseType === 'perpetual' ? 'Ebb Pro License' : 'Ebb Pro Subscription',
              description: licenseType === 'perpetual' 
                ? 'Pay once, keep forever. One year of updates included. 30-day money-back guarantee.'
                : 'Monthly subscription with continuous updates. Cancel anytime. 30-day money-back guarantee.',
            },
            unit_amount: licenseType === 'perpetual' ? 3700 : 500, // $37 one-time or $5/month
            ...(licenseType === 'subscription' ? { recurring: { interval: 'month' } } : {})
          },
          quantity: 1
        }
      ],
      mode: licenseType === 'perpetual' ? 'payment' : 'subscription',
      success_url: 'https://ebb.cool/license/callback?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://ebb.cool/license/callback',
      client_reference_id: user.id,
      customer_creation: 'always',
      customer_email: user.email,
      allow_promotion_codes: true,
      metadata: {
        user_id: user.id
      }
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (err) {
    console.error('Create checkout error:', err)
    return new Response(
      JSON.stringify({ error: { message: (err as Error).message } }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
}) 
