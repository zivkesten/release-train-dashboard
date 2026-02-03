import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Constants for validation and security
const TOKEN_LENGTH = 64 // 32 bytes = 64 hex characters
const TOKEN_EXPIRY_MINUTES = 5
const MAX_CONCURRENT_TOKENS_PER_USER = 5
const TOKEN_REGEX = /^[a-f0-9]{64}$/i

// Generic error codes to prevent information leakage
const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

/**
 * Validates that a token has the correct format (64 hex characters)
 */
function isValidTokenFormat(token: string): boolean {
  return typeof token === 'string' && TOKEN_REGEX.test(token)
}

/**
 * Validates that a userId is a valid UUID format
 */
function isValidUUID(id: string): boolean {
  if (typeof id !== 'string') return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Returns a standardized error response with generic messages
 * to prevent information disclosure
 */
function errorResponse(code: keyof typeof ERROR_CODES, status: number): Response {
  return new Response(
    JSON.stringify({ error: ERROR_CODES[code] }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
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

    let body: { action?: string; userId?: string; token?: string }
    try {
      body = await req.json()
    } catch {
      console.error('Invalid JSON body')
      return errorResponse('INVALID_REQUEST', 400)
    }

    const { action, userId, token } = body

    // Validate action
    if (!action || !['generate', 'validate'].includes(action)) {
      console.error('Invalid action:', action)
      return errorResponse('INVALID_REQUEST', 400)
    }

    console.log(`QR Login action: ${action}`)

    if (action === 'generate') {
      // Verify admin is making the request
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        console.error('Missing or invalid authorization header')
        return errorResponse('UNAUTHORIZED', 401)
      }

      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      })

      const jwtToken = authHeader.replace('Bearer ', '')
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(jwtToken)
      
      if (claimsError || !claimsData?.claims) {
        console.error('Claims verification failed:', claimsError?.message)
        return errorResponse('UNAUTHORIZED', 401)
      }

      const adminUserId = claimsData.claims.sub

      // Use service role to check if user is admin
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
      
      const { data: isAdminData, error: isAdminError } = await supabaseAdmin.rpc('is_admin', { _user_id: adminUserId })
      
      if (isAdminError || !isAdminData) {
        console.error('Admin check failed for user:', adminUserId)
        return errorResponse('FORBIDDEN', 403)
      }

      // Validate userId format
      if (!userId || !isValidUUID(userId)) {
        console.error('Invalid or missing userId')
        return errorResponse('INVALID_REQUEST', 400)
      }

      // Clean up expired tokens and enforce max concurrent tokens per user
      const { error: cleanupError } = await supabaseAdmin
        .from('login_tokens')
        .delete()
        .eq('user_id', userId)
        .lt('expires_at', new Date().toISOString())
      
      if (cleanupError) {
        console.error('Token cleanup failed:', cleanupError.message)
      }

      // Check current active token count for the target user
      const { count: activeTokenCount, error: countError } = await supabaseAdmin
        .from('login_tokens')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
      
      if (countError) {
        console.error('Token count check failed:', countError.message)
        return errorResponse('INTERNAL_ERROR', 500)
      }

      if (activeTokenCount !== null && activeTokenCount >= MAX_CONCURRENT_TOKENS_PER_USER) {
        console.error(`Max concurrent tokens exceeded for user ${userId}`)
        return errorResponse('INVALID_REQUEST', 400)
      }

      // Generate a secure random token (32 bytes = 64 hex characters)
      const randomBytes = new Uint8Array(32)
      crypto.getRandomValues(randomBytes)
      const loginToken = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')

      // Set expiration
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString()

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
        console.error('Token insert failed:', tokenError.message)
        return errorResponse('INTERNAL_ERROR', 500)
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
      // Validate token format before database lookup
      if (!token || !isValidTokenFormat(token)) {
        console.error('Invalid token format')
        return errorResponse('INVALID_TOKEN', 401)
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

      // Find the token - use a single query to check all conditions
      // This prevents timing attacks by using a consistent code path
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('login_tokens')
        .select('*')
        .eq('token', token)
        .single()

      // Unified validation: Check all conditions and return same error
      // This prevents timing attacks and token enumeration
      const isInvalid = 
        tokenError || 
        !tokenData || 
        tokenData.used_at !== null || 
        new Date(tokenData.expires_at) < new Date()

      if (isInvalid) {
        // Log detailed reason server-side only
        if (tokenError) {
          console.error('Token lookup failed:', tokenError.message)
        } else if (!tokenData) {
          console.error('Token not found')
        } else if (tokenData.used_at) {
          console.error('Token already used')
        } else {
          console.error('Token expired')
        }
        // Return generic error to client
        return errorResponse('INVALID_TOKEN', 401)
      }

      // Mark token as used immediately (before any other operations)
      const { error: updateError } = await supabaseAdmin
        .from('login_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id)
        .is('used_at', null) // Additional safety: only update if not already used

      if (updateError) {
        console.error('Failed to mark token as used:', updateError.message)
        return errorResponse('INTERNAL_ERROR', 500)
      }

      // Get user email for generating magic link
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(tokenData.user_id)

      if (userError || !userData?.user) {
        console.error('User lookup failed:', userError?.message)
        return errorResponse('INVALID_TOKEN', 401)
      }

      // Generate a magic link for the user
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userData.user.email!,
      })

      if (linkError || !linkData) {
        console.error('Magic link generation failed:', linkError?.message)
        return errorResponse('INTERNAL_ERROR', 500)
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

    return errorResponse('INVALID_REQUEST', 400)

  } catch (error: unknown) {
    console.error('QR Login error:', error instanceof Error ? error.message : 'Unknown error')
    return errorResponse('INTERNAL_ERROR', 500)
  }
})
