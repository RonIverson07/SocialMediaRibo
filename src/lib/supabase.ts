import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-please-set-env-vars.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'no-key-provided';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (typeof window === 'undefined') {
        console.error('❌ CRITICAL: Supabase environment variables are MISSING on the server!');
        console.error('Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your deployment (Vercel/Environment Variables).');
    }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
