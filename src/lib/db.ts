import { createClient } from '@supabase/supabase-js';

// Build-compatible: env vars may not be set during `next build`. Use
// placeholder values at module init time to prevent build crashes.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

export const db = createClient(supabaseUrl, supabaseKey);

export interface User {
  id: string;
  email: string;
  credits: number;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  template_id: string;
  name: string;
  current_html: string;
  selected_skills: string[];
  design_profile: DesignProfile | null;
  created_at: string;
  updated_at: string;
}

export interface Version {
  id: string;
  project_id: string;
  html_content: string;
  message: string;
  created_at: string;
}

export interface DesignProfile {
  scene: 'personal' | 'shared';
  theme: 'dark' | 'light';
  colorStrategy: 'restrained' | 'committed' | 'full-palette';
  accentColor: string;
  accentRatio: number;
  borderRadius: number;
  shadowStyle: 'none' | 'soft';
  motion: 'none' | 'subtle' | 'playful';
  fontFamily: string;
  bodyFontSize: number;
  lineHeight: number;
  density: 'sparse' | 'moderate';
}
