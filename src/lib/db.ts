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
  draft_html: string | null;
  selected_skills: string[];
  design_profile: DesignProfile | null;
  status: 'active' | 'archived';
  pinned: boolean;
  archived_at: string | null;
  description: string | null;
  thumbnail_url: string | null;
  onboarding_state: OnboardingState | null;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  project_id: string | null;
  created_at: string;
}

export interface PublishedApp {
  id: string;
  project_id: string;
  slug: string;
  html_content: string;
  title: string | null;
  description: string | null;
  cover_url: string | null;
  visibility: 'public' | 'unlisted';
  version_id: string | null;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
}

export type VersionKind = 'ai_edit' | 'manual' | 'publish' | 'rollback' | 'repair' | 'checkpoint';

export interface Version {
  id: string;
  project_id: string;
  html_content: string;
  message: string;
  summary: string | null;
  kind: VersionKind;
  is_checkpoint: boolean;
  parent_version_id: string | null;
  created_at: string;
}

export interface OnboardingState {
  first_ai_edit?: boolean;
  first_publish?: boolean;
  first_rollback?: boolean;
  dismissed_at?: string;
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

  // Design v2
  styleLocked?: boolean;
  templateBound?: string;
  intentMode?: 'visual_only' | 'functional' | 'both';
}
