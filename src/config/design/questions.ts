// src/config/design/questions.ts

export interface Question {
  id: string;
  round: number;
  text: string;
  options: QuestionOption[];
}

export interface QuestionOption {
  id: string;
  label: string;
  description: string;
  isDefault?: boolean;
}

export interface TeachAnswer {
  questionId: string;
  selectedOptionId: string;
  customText?: string;
}

export const QUESTIONS: Question[] = [
  {
    id: 'scene',
    round: 1,
    text: '谁会用它？',
    options: [
      { id: 'personal', label: '自己用', description: '随手记录、管理日常，不打算给别人看' },
      { id: 'shared', label: '可能会分享', description: '给朋友、家人或同事看看，希望拿得出手' },
      { id: 'unsure', label: '不确定', description: '先做着看看', isDefault: true },
    ],
  },
  {
    id: 'feel',
    round: 2,
    text: '你希望它给你的感觉是？',
    options: [
      { id: 'quiet', label: '安静克制', description: '留白多，少即是多，不打扰' },
      { id: 'warm', label: '温暖亲切', description: '有色彩、有温度，让人心情好' },
      { id: 'bold', label: '鲜明醒目', description: '第一眼就有印象，不想淹没在 App 里' },
      { id: 'unsure', label: '不确定', description: '先默认', isDefault: true },
    ],
  },
  {
    id: 'motion',
    round: 3,
    text: '动效方面，你喜欢？',
    options: [
      { id: 'still', label: '几乎不动', description: '干净利落，点哪里就是哪里' },
      { id: 'subtle', label: '微妙过渡', description: '像呼吸一样自然，不刻意', isDefault: true },
      { id: 'playful', label: '有点趣味', description: '动画让人会心一笑' },
    ],
  },
  {
    id: 'recipe',
    round: 4,
    text: '基于你的偏好，这里有 3 种解读——',
    options: [
      { id: 'cool', label: '冷感克制', description: '靛蓝 accent · 6px 圆角 · 极简' },
      { id: 'warm-stone', label: '温润质朴', description: '琥珀 accent · 12px 圆角 · 柔阴影' },
      { id: 'editorial', label: '编辑感排版', description: '黑白灰 · 2px 圆角 · 字体即设计' },
    ],
  },
  {
    id: 'font',
    round: 5,
    text: '字体风格，你更接近哪种感觉？',
    options: [
      { id: 'system', label: '系统原生字体', description: '快、干净，不额外加载字体文件', isDefault: true },
      { id: 'character', label: '有个性的无衬线', description: '有点辨识度，引入 Google Font CDN' },
    ],
  },
];

export const DEFAULT_ANSWERS: Record<string, string> = {
  scene: 'unsure',
  feel: 'unsure',
  motion: 'subtle',
  recipe: 'cool',
  font: 'system',
};
