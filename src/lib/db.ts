import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
