import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!url || !anonKey) {
  // keep quiet at import time; runtime code should handle missing envs
}

export const supabase = createClient(url, anonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export default supabase;
