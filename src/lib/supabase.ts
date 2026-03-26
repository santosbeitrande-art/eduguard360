<<<<<<< HEAD
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
=======
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gyrpigvvmndfjwswknud.supabase.co";

const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5cnBpZ3Z2bW5kZmp3c3drbnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTU0NTEsImV4cCI6MjA4NzQzMTQ1MX0.IvggGGl3vh3glxW_KmaJ8LKel8AxBwuvYxMKDhlbuAs";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
>>>>>>> 5a29b53 (primeiro deploy eduguard360)
