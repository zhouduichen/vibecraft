export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  cover_url: string;
  tags: string[];
  compatibleSkills: string[];
  origin?: {
    type: 'builtin' | 'open-source';
    repo?: string;
    license?: string;
    author?: string;
  };
}
