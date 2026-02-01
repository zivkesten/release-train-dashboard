import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const body = await req.json()
    const { action, userId, token } = body

    console.log(`QR Login action: ${action}`)

    if (action === 'generate') {
      // Verify admin is making the request
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      })

      const jwtToken = authHeader.replace('Bearer ', '')
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(jwtToken)
      
      if (claimsError || !claimsData?.claims) {
        console.error('Claims error:', claimsError)
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const adminUserId = claimsData.claims.sub

      // Use service role to check if user is admin
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
      
      const { data: isAdminData, error: isAdminError } = await supabaseAdmin.rpc('is_admin', { _user_id: adminUserId })
      
      if (isAdminError || !isAdminData) {
        console.error('Admin check error:', isAdminError)
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate a secure random token
      const randomBytes = new Uint8Array(32)
      crypto.getRandomValues(randomBytes)
      const loginToken = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')

      // Set expiration to 5 minutes from now
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

      // Store the token
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('login_tokens')
        .insert({
          user_id: userId,
          token: loginToken,
          expires_at: expiresAt,
          created_by: adminUserId,
        })
        .select()
        .single()

      if (tokenError) {
        console.error('Token insert error:', tokenError)
        return new Response(
          JSON.stringify({ error: 'Failed to generate token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Generated login token for user ${userId}, expires at ${expiresAt}`)

      return new Response(
        JSON.stringify({ 
          token: loginToken, 
          expiresAt,
          tokenId: tokenData.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'validate') {
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Token is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

      // Find the token
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('login_tokens')
        .select('*')
        .eq('token', token)
        .single()

      if (tokenError || !tokenData) {
        console.error('Token lookup error:', tokenError)
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if already used
      if (tokenData.used_at) {
        console.log('Token already used')
        return new Response(
          JSON.stringify({ error: 'Token has already been used' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if expired
      if (new Date(tokenData.expires_at) < new Date()) {
        console.log('Token expired')
        return new Response(
          JSON.stringify({ error: 'Token has expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Mark token as used
      await supabaseAdmin
        .from('login_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id)

      // Get user email for generating magic link
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(tokenData.user_id)

      if (userError || !userData?.user) {
        console.error('User lookup error:', userError)
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate a magic link for the user
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userData.user.email!,
      })

      if (linkError || !linkData) {
        console.error('Magic link generation error:', linkError)
        return new Response(
          JSON.stringify({ error: 'Failed to generate login link' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Successfully validated token for user ${tokenData.user_id}`)

      // Return the token hash for client-side verification
      const url = new URL(linkData.properties.action_link)
      const tokenHash = url.searchParams.get('token')

      return new Response(
        JSON.stringify({ 
          success: true,
          email: userData.user.email,
          tokenHash,
          type: 'magiclink'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('QR Login error:', error)
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})