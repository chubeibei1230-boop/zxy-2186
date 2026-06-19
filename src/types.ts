export type PracticeStatus = '待讲解' | '练习中' | '需协助' | '可展示' | '暂缓';

export type Difficulty = '入门' | '初级' | '中级' | '高级' | '大师';

export interface PatternStep {
  id: string;
  title: string;
  description: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  quantity: string;
  note?: string;
}

export interface PaperPattern {
  id: string;
  order: number;
  name: string;
  theme: string;
  foldingMethod: string;
  knifeTechniques: string;
  estimatedDuration: number;
  suitablePeople: string;
  riskWarnings: string;
  backupPlan: string;
  status: PracticeStatus;
  difficulty: Difficulty;
  owner: string;
  steps: PatternStep[];
  materials: MaterialItem[];
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface FilterState {
  keyword: string;
  theme: string;
  difficulty: Difficulty | '';
  status: PracticeStatus | '';
  owner: string;
}

export interface PracticePlanItem {
  patternId: string;
  snapshot?: PaperPattern;
  addedAt: number;
}

export interface PracticePlan {
  id: string;
  name: string;
  scenario: string;
  estimatedDuration: string;
  owner: string;
  items: PracticePlanItem[];
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  totalDurationLimit: number;
  maxItemsPerOwner: number;
}

export interface CheckIssue {
  type: 'theme_consecutive' | 'duration_exceed' | 'risk_missing' | 'owner_too_many' | 'backup_missing';
  severity: 'warning' | 'error';
  message: string;
  patternIds: string[];
}

export const STATUS_OPTIONS: PracticeStatus[] = ['待讲解', '练习中', '需协助', '可展示', '暂缓'];
export const DIFFICULTY_OPTIONS: Difficulty[] = ['入门', '初级', '中级', '高级', '大师'];

export const STATUS_COLORS: Record<PracticeStatus, string> = {
  '待讲解': '#3b82f6',
  '练习中': '#f59e0b',
  '需协助': '#ef4444',
  '可展示': '#10b981',
  '暂缓': '#6b7280',
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  '入门': '#22c55e',
  '初级': '#84cc16',
  '中级': '#eab308',
  '高级': '#f97316',
  '大师': '#dc2626',
};

export function createEmptyPattern(order: number): PaperPattern {
  const now = Date.now();
  return {
    id: `pattern_${now}_${Math.random().toString(36).slice(2, 9)}`,
    order,
    name: '',
    theme: '',
    foldingMethod: '',
    knifeTechniques: '',
    estimatedDuration: 30,
    suitablePeople: '',
    riskWarnings: '',
    backupPlan: '',
    status: '待讲解',
    difficulty: '入门',
    owner: '',
    steps: [],
    materials: [],
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function createEmptyPlan(order: number): PracticePlan {
  const now = Date.now();
  return {
    id: `plan_${now}_${Math.random().toString(36).slice(2, 9)}`,
    name: '',
    scenario: '',
    estimatedDuration: '',
    owner: '',
    items: [],
    order,
    createdAt: now,
    updatedAt: now,
  };
}
