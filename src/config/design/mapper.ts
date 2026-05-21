// src/config/design/mapper.ts
import type { DesignProfile } from '@/lib/db';
import type { TeachAnswer } from './questions';
import { RECIPES } from './recipes';

/**
 * Maps collected Teach answers to a concrete DesignProfile.
 * Priority: recipe card > base answers > defaults.
 */
export function mapAnswersToProfile(answers: TeachAnswer[]): DesignProfile {
  const get = (questionId: string): string | undefined =>
    answers.find(a => a.questionId === questionId)?.selectedOptionId;

  const recipeChoice = get('recipe');
  const FALLBACK_RECIPE_ID = 'cool';
  const baseRecipe = recipeChoice
    ? RECIPES.find(r => r.id === recipeChoice)?.profile
    : RECIPES.find(r => r.id === FALLBACK_RECIPE_ID)?.profile;

  if (!baseRecipe) throw new Error(`Design recipe not found: "${recipeChoice || FALLBACK_RECIPE_ID}"`);

  // Apply top-level overrides from round 1-3 answers
  const sceneAnswer = get('scene');
  const feelAnswer = get('feel');
  const motionAnswer = get('motion');
  const fontAnswer = get('font');

  const profile: DesignProfile = {
    ...baseRecipe,
    scene: sceneAnswer === 'shared' ? 'shared' : baseRecipe.scene,
    colorStrategy:
      feelAnswer === 'quiet' ? 'restrained'
      : feelAnswer === 'warm' ? 'committed'
      : feelAnswer === 'bold' ? 'full-palette'
      : baseRecipe.colorStrategy,
    motion:
      motionAnswer === 'still' ? 'none'
      : motionAnswer === 'playful' ? 'playful'
      : baseRecipe.motion,
    fontFamily:
      fontAnswer === 'character'
        ? '"Inter", system-ui, -apple-system, sans-serif'
        : baseRecipe.fontFamily,
  };

  return profile;
}

export function mapProfileToPromptText(profile: DesignProfile): string {
  return `【设计增强 · 用户审美偏好】
- 受众: ${profile.scene === 'personal' ? '自己使用' : '可分享给他人'}
- 主题模式: ${profile.theme === 'dark' ? '深色' : '浅色'}
- 色彩策略: ${profile.colorStrategy === 'restrained' ? '克制（强调色占比 ≤10%）' : profile.colorStrategy === 'committed' ? '投入（强调色占比 30-60%）' : '全调色板（大胆用色）'}
- 主强调色: ${profile.accentColor}，占比约 ${Math.round(profile.accentRatio * 100)}%
- 圆角: ${profile.borderRadius}px
- 阴影: ${profile.shadowStyle === 'none' ? '不使用阴影，用边框区分层级' : '柔和投影营造层次'}
- 字号: 正文 ${profile.bodyFontSize}px，行高 ${profile.lineHeight}
- 密度: ${profile.density === 'sparse' ? '宽松' : '适中'}
- 动效: ${profile.motion === 'none' ? '几乎无动画' : profile.motion === 'subtle' ? '微妙过渡，150-200ms，cubic-bezier(0.16,1,0.3,1)' : '有趣味感，200-300ms，可用 stagger'}
- 字体: ${profile.fontFamily}

【设计铁律 · 禁止项】
- 禁止纯黑 #000 和纯白 #fff，所有中性色向主色调微偏
- 禁止渐变色文字（background-clip: text）
- 禁止侧边装饰线（border-left/right > 1px 作为强调）
- 禁止毛玻璃/玻璃态作为默认装饰
- 禁止相同尺寸的卡片网格（同尺寸 icon+标题+正文 重复排列）
- 不要一上来就弹窗，先用内联/渐进展开替代
- 禁止对 CSS 布局属性做动画（width/height/top/left/margin/padding），缓出用指数曲线
- 尊重 prefers-reduced-motion
- 正文行宽不超过 65-75 个字符
- 字号层级间比率 ≥1.25
- 间距要有节奏变化，不要到处用一样的 padding
- 卡片不是默认选择，只在真正需要时才用
- 不要把所有东西都包在容器里
- 每个词都要有存在的理由，不重复标题内容
- 不用 em dash（—），用逗号、冒号、句号代替`;
}
