import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://pvbcdndqjguzqeafhwhw.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YmNkbmRxamd1enFlYWZod2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE0MjIyMTYsImV4cCI6MjAzNzAyMjIxNn0.VbY1pD7XkQk-hR6o3hO0jXg2-m2T9jB0D9S1wA_qX9Q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'ellars_us_com_auth_token',
  },
});
