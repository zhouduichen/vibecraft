export interface EditableSlot {
  id: string;
  label: string;
  category: 'content' | 'style' | 'structure' | 'data';
  type: 'text' | 'color' | 'number' | 'select' | 'boolean' | 'block';
  defaultValue?: string;
  options?: { label: string; value: string }[];
  bounds?: { min?: number; max?: number };
  aiPrompt: string;
}

export interface DataField {
  name: string;
  type: 'string' | 'number' | 'array' | 'object';
  label: string;
  description?: string;
  fields?: DataField[];
}

export interface Suggestion {
  text: string;
  skillId?: string;
  category: 'content' | 'skill' | 'design' | 'fix';
  condition?: {
    type: 'skill_not_active' | 'no_error';
    skillId?: string;
  };
}

export interface DesignBound {
  allowedThemes: ('dark' | 'light')[];
  allowedColorStrategies: string[];
  minBorderRadius: number;
  maxBorderRadius: number;
  allowedMotion: string[];
}

export interface TemplateManifest {
  id: string;
  isBlank?: boolean;
  editableSlots: EditableSlot[];
  dataSchema: DataField[];
  supportedSkills: string[];
  defaultSuggestions: Suggestion[];
  designBounds?: DesignBound;
}
