import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabasePublicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY || process.env.SUPABASE_PUBLIC_KEY || '';

if (!supabaseUrl || !supabasePublicKey) {
  console.warn('Missing Supabase environment variables. Please check your .env file.');
}

// Public client - safe for browser use
export const supabase = createClient(supabaseUrl, supabasePublicKey);

// Server-side admin client (uses secret key - NEVER expose to browser!)
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY || '';

  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY is not set');
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export default supabase;
