import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hgytzvhrnbkpfvgodwyn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneXR6dmhybmJrcGZ2Z29kd3luIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY5NTAxNywiZXhwIjoyMTA2MjcxMDE3fQ.nhbXB0b8BWlCVbXU55Xpi9zxk_Y4ouZtEpLukMePIc0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
