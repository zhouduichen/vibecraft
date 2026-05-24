import type { Skill } from '@/config/skills';

export interface ValidationResult {
  skillId: string;
  ruleType: string;
  passed: boolean;
  message: string;
}

export function validateGeneratedHtml(
  html: string,
  activeSkills: Skill[],
): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const skill of activeSkills) {
    for (const rule of skill.validationRules) {
      let passed = false;

      switch (rule.type) {
        case 'script_exists': {
          // Check if the CDN URL appears in a <script> tag
          const escaped = rule.target?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') || '';
          const scriptRegex = new RegExp(`<script[^>]*src=["'][^"']*${escaped}[^"']*["']`, 'i');
          passed = scriptRegex.test(html);
          break;
        }
        case 'canvas_exists': {
          passed = /<canvas[\s>]/i.test(html);
          break;
        }
        case 'element_exists': {
          // Rough check: look for an opening HTML tag matching the selector
          if (rule.selector) {
            const tagMatch = rule.selector.match(/^(\w+)/);
            if (tagMatch) {
              passed = new RegExp(`<${tagMatch[1]}[\\s>]`, 'i').test(html);
            }
          }
          break;
        }
        case 'state_field_exists': {
          // Look for useState with the target variable name
          if (rule.target) {
            const stateRegex = new RegExp(
              `(?:const\\s+\\[${rule.target}\\b|${rule.target}\\s*[=:]|${rule.target}\\.)`,
              'i'
            );
            passed = stateRegex.test(html);
          }
          break;
        }
      }

      results.push({
        skillId: skill.id,
        ruleType: rule.type,
        passed,
        message: passed ? '' : rule.message,
      });
    }
  }

  return results;
}
