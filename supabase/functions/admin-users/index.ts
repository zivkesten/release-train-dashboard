import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_EMAIL_LENGTH = 254;
const MAX_DISPLAY_NAME_LENGTH = 100;
const MAX_POSITION_LENGTH = 100;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;
const VALID_ROLES = ['admin', 'dev', 'qa', 'product_manager'] as const;

// Generic error codes to prevent information leakage
const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_REQUEST: 'INVALID_REQUEST',
  USER_EXISTS: 'USER_EXISTS',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SELF_DELETE: 'SELF_DELETE',
} as const;

type AppRole = typeof VALID_ROLES[number];

interface CreateUserRequest {
  action: 'create';
  email: string;
  password: string;
  displayName: string;
  position?: string;
  role: AppRole;
}

interface DeleteUserRequest {
  action: 'delete';
  userId: string;
}

interface UpdateUserRequest {
  action: 'update';
  userId: string;
  displayName?: string;
  position?: string;
}

type RequestBody = CreateUserRequest | DeleteUserRequest | UpdateUserRequest;

/**
 * Validates that a string is a valid UUID format
 */
function isValidUUID(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validates email format with comprehensive regex
 */
function isValidEmail(email: unknown): email is string {
  if (typeof email !== 'string') return false;
  if (email.length > MAX_EMAIL_LENGTH) return false;
  // RFC 5322 compliant email regex (simplified but effective)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email);
}

/**
 * Validates password meets requirements
 */
function isValidPassword(password: unknown): password is string {
  if (typeof password !== 'string') return false;
  return password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH;
}

/**
 * Validates a role is in the allowed list
 */
function isValidRole(role: unknown): role is AppRole {
  return typeof role === 'string' && VALID_ROLES.includes(role as AppRole);
}

/**
 * Validates and sanitizes a display name
 */
function validateDisplayName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_DISPLAY_NAME_LENGTH) return null;
  return trimmed;
}

/**
 * Validates and sanitizes a position string
 */
function validatePosition(position: unknown): string | null {
  if (position === undefined || position === null || position === '') return '';
  if (typeof position !== 'string') return null;
  const trimmed = position.trim();
  if (trimmed.length > MAX_POSITION_LENGTH) return null;
  return trimmed;
}

/**
 * Returns a standardized error response with generic messages
 */
function errorResponse(code: keyof typeof ERROR_CODES, status: number): Response {
  return new Response(
    JSON.stringify({ error: ERROR_CODES[code] }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the authorization header to verify the requesting user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return errorResponse('UNAUTHORIZED', 401);
    }

    // Verify the requesting user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      console.error('Token verification failed:', authError?.message);
      return errorResponse('UNAUTHORIZED', 401);
    }

    // Check if requesting user is admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin');

    if (rolesError || !roles || roles.length === 0) {
      console.error('Admin access denied for user:', requestingUser.id);
      return errorResponse('FORBIDDEN', 403);
    }

    // Parse and validate request body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      console.error('Invalid JSON body');
      return errorResponse('INVALID_REQUEST', 400);
    }

    // Validate action
    if (!body.action || !['create', 'delete', 'update'].includes(body.action)) {
      console.error('Invalid action:', body.action);
      return errorResponse('INVALID_REQUEST', 400);
    }

    // Handle CREATE user
    if (body.action === 'create') {
      const { email, password, displayName, position, role } = body as CreateUserRequest;

      // Validate email
      if (!isValidEmail(email)) {
        console.error('Invalid email format or length');
        return errorResponse('INVALID_REQUEST', 400);
      }

      // Validate password
      if (!isValidPassword(password)) {
        console.error('Invalid password length');
        return errorResponse('INVALID_REQUEST', 400);
      }

      // Validate display name
      const validatedDisplayName = validateDisplayName(displayName);
      if (validatedDisplayName === null) {
        console.error('Invalid display name');
        return errorResponse('INVALID_REQUEST', 400);
      }

      // Validate position (optional)
      const validatedPosition = validatePosition(position);
      if (validatedPosition === null) {
        console.error('Invalid position length');
        return errorResponse('INVALID_REQUEST', 400);
      }

      // Validate role
      if (!isValidRole(role)) {
        console.error('Invalid role:', role);
        return errorResponse('INVALID_REQUEST', 400);
      }

      // Create user with admin API
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: validatedDisplayName,
        },
      });

      if (createError) {
        console.error('User creation failed:', createError.message);
        // Check for duplicate email without exposing details
        if (createError.message?.toLowerCase().includes('already') || 
            createError.message?.toLowerCase().includes('exists') ||
            createError.message?.toLowerCase().includes('duplicate')) {
          return errorResponse('USER_EXISTS', 409);
        }
        return errorResponse('INTERNAL_ERROR', 500);
      }

      // Update profile with position
      if (validatedPosition) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ position: validatedPosition, display_name: validatedDisplayName })
          .eq('id', newUser.user.id);
        
        if (profileError) {
          console.error('Profile update failed:', profileError.message);
        }
      }

      // Assign role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: newUser.user.id, role });

      if (roleError) {
        console.error('Role assignment failed:', roleError.message);
        // User was created but role assignment failed - log but don't fail request
      }

      console.log(`User created successfully: ${newUser.user.id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: { 
            id: newUser.user.id, 
            email: newUser.user.email,
            displayName: validatedDisplayName,
            position: validatedPosition,
            role,
          } 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle DELETE user
    if (body.action === 'delete') {
      const { userId } = body as DeleteUserRequest;

      // Validate userId format
      if (!isValidUUID(userId)) {
        console.error('Invalid userId format');
        return errorResponse('INVALID_REQUEST', 400);
      }

      // Prevent self-deletion
      if (userId === requestingUser.id) {
        console.error('Attempted self-deletion by user:', requestingUser.id);
        return errorResponse('SELF_DELETE', 400);
      }

      // Delete user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error('User deletion failed:', deleteError.message);
        if (deleteError.message?.toLowerCase().includes('not found')) {
          return errorResponse('NOT_FOUND', 404);
        }
        return errorResponse('INTERNAL_ERROR', 500);
      }

      console.log(`User deleted successfully: ${userId}`);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle UPDATE user
    if (body.action === 'update') {
      const { userId, displayName, position } = body as UpdateUserRequest;

      // Validate userId format
      if (!isValidUUID(userId)) {
        console.error('Invalid userId format');
        return errorResponse('INVALID_REQUEST', 400);
      }

      const updates: Record<string, string> = {};
      
      // Validate and add displayName if provided
      if (displayName !== undefined) {
        const validatedDisplayName = validateDisplayName(displayName);
        if (validatedDisplayName === null) {
          console.error('Invalid display name');
          return errorResponse('INVALID_REQUEST', 400);
        }
        updates.display_name = validatedDisplayName;
      }
      
      // Validate and add position if provided
      if (position !== undefined) {
        const validatedPosition = validatePosition(position);
        if (validatedPosition === null) {
          console.error('Invalid position');
          return errorResponse('INVALID_REQUEST', 400);
        }
        updates.position = validatedPosition;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (updateError) {
          console.error('Profile update failed:', updateError.message);
          return errorResponse('INTERNAL_ERROR', 500);
        }
      }

      console.log(`User updated successfully: ${userId}`);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return errorResponse('INVALID_REQUEST', 400);

  } catch (error) {
    console.error('Unexpected error:', error instanceof Error ? error.message : 'Unknown error');
    return errorResponse('INTERNAL_ERROR', 500);
  }
});
