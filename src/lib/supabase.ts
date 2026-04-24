import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qvuieguqrifosiwhjmfu.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dWllZ3Vxcmlmb3Npd2hqbWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzk0MjksImV4cCI6MjA5MjUxNTQyOX0.XCWH39l3akT1nUx38M-EZHkmW4iIvP1Ry9J6fnXdIhM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);