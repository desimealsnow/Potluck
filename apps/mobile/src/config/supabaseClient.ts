import { createClient } from '@supabase/supabase-js';

// These should be moved to environment variables in production
const SUPABASE_URL = 'https://abucxqflzhtjtwxmjrmj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidWN4cWZsemh0anR3eG1qcm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MTMzOTUsImV4cCI6MjA2NTk4OTM5NX0.7ONQjzJj5Qi0Mz6RQhv7ImAIgHEzOfu4Xy43g_Zx8MI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

