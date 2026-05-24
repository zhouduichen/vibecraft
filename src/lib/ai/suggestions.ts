import type { Suggestion } from '@/config/manifests/types';

interface SuggestionContext {
  manifestSuggestions: Suggestion[];
  activeSkills: string[];
  hasError: boolean;
  lastChangeType?: 'content' | 'skill' | 'design' | 'fix';
}

export function generateSuggestions(context: SuggestionContext): Suggestion[] {
  const result: Suggestion[] = [];

  // 1. Manifest suggestions (filtered by conditions)
  for (const s of context.manifestSuggestions) {
    if (s.condition?.type === 'skill_not_active') {
      if (context.activeSkills.includes(s.skillId || '')) continue;
    }
    if (s.condition?.type === 'no_error') {
      if (context.hasError) continue;
    }
    result.push(s);
  }

  // 2. Follow-up suggestions based on last change
  if (context.lastChangeType === 'skill') {
    result.push({
      text: '新功能用起来怎么样？需要调整位置或样式吗？',
      category: 'content',
    });
  } else if (context.lastChangeType === 'fix') {
    result.push({
      text: '修复完成，看看还有没有其他问题？',
      category: 'fix',
    });
  }

  // Keep at most 6
  return result.slice(0, 6);
}
