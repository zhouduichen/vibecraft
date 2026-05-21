// src/config/design/recipes.ts
import type { DesignProfile } from '@/lib/db';

export interface Recipe {
  id: string;
  name: string;
  description: string;
  profile: DesignProfile;
}

export const RECIPES: Recipe[] = [
  {
    id: 'cool',
    name: '冷感克制',
    description: '极简数字工具风格，像 Linear / Things——专业但不冷',
    profile: {
      scene: 'personal',
      theme: 'dark',
      colorStrategy: 'restrained',
      accentColor: 'indigo',
      accentRatio: 0.08,
      borderRadius: 8,
      shadowStyle: 'none',
      motion: 'subtle',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      bodyFontSize: 13,
      lineHeight: 1.7,
      density: 'sparse',
    },
  },
  {
    id: 'warm-stone',
    name: '温润质朴',
    description: '有手工感的数字产品，像 Day One / Ulysses——有温度但不腻',
    profile: {
      scene: 'personal',
      theme: 'dark',
      colorStrategy: 'committed',
      accentColor: 'amber',
      accentRatio: 0.3,
      borderRadius: 12,
      shadowStyle: 'soft',
      motion: 'subtle',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      bodyFontSize: 14,
      lineHeight: 1.6,
      density: 'moderate',
    },
  },
  {
    id: 'editorial',
    name: '编辑感排版',
    description: '字体即设计的全部，像 IA Writer / 好杂志——退后，让内容说话',
    profile: {
      scene: 'personal',
      theme: 'dark',
      colorStrategy: 'restrained',
      accentColor: 'zinc',
      accentRatio: 0.05,
      borderRadius: 4,
      shadowStyle: 'none',
      motion: 'none',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", serif',
      bodyFontSize: 15,
      lineHeight: 1.8,
      density: 'sparse',
    },
  },
];
