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

export interface ExecutionItemRecord {
  patternId: string;
  patternSnapshot: PaperPattern;
  actualStatus: PracticeStatus;
  actualDuration: number;
  issuesOnSite: string;
  completed: boolean;
  needAssistance: boolean;
  usedBackupPlan: boolean;
  riskReminded: boolean;
  startedAt: number;
  endedAt?: number;
}

export interface PracticeExecution {
  id: string;
  planId: string;
  planSnapshot: PracticePlan;
  currentIndex: number;
  items: ExecutionItemRecord[];
  status: 'ready' | 'running' | 'paused' | 'completed';
  startedAt: number;
  endedAt?: number;
  pausedAt?: number;
  totalPausedDuration: number;
}

export interface ReviewSummary {
  planDuration: number;
  actualDuration: number;
  durationDifference: number;
  incompletePatterns: PaperPattern[];
  assistancePatterns: PaperPattern[];
  missedRisks: { pattern: PaperPattern; warning: string }[];
  usedBackupPatterns: PaperPattern[];
  ownerStats: Record<string, { total: number; completed: number; needAssistance: number }>;
  materialsReview: {
    prepared: { name: string; quantity: string; note?: string; pattern: string }[];
    missing: { name: string; quantity: string; note?: string; pattern: string }[];
  };
  overallNotes: string;
}

export interface ReviewRecord {
  id: string;
  planId: string;
  planName: string;
  executionId: string;
  summary: ReviewSummary;
  execution: PracticeExecution;
  createdAt: number;
  updatedAt: number;
}

export function createExecution(plan: PracticePlan, patterns: PaperPattern[]): PracticeExecution {
  const now = Date.now();
  const items: ExecutionItemRecord[] = plan.items.map(item => {
    const pattern = patterns.find(p => p.id === item.patternId) || item.snapshot!;
    return {
      patternId: item.patternId,
      patternSnapshot: { ...pattern },
      actualStatus: pattern.status,
      actualDuration: 0,
      issuesOnSite: '',
      completed: false,
      needAssistance: false,
      usedBackupPlan: false,
      riskReminded: false,
      startedAt: 0,
    };
  });

  return {
    id: `exec_${now}_${Math.random().toString(36).slice(2, 9)}`,
    planId: plan.id,
    planSnapshot: { ...plan },
    currentIndex: 0,
    items,
    status: 'ready',
    startedAt: 0,
    totalPausedDuration: 0,
  };
}

export function createEmptyReviewRecord(): ReviewRecord {
  const now = Date.now();
  return {
    id: `review_${now}_${Math.random().toString(36).slice(2, 9)}`,
    planId: '',
    planName: '',
    executionId: '',
    summary: {
      planDuration: 0,
      actualDuration: 0,
      durationDifference: 0,
      incompletePatterns: [],
      assistancePatterns: [],
      missedRisks: [],
      usedBackupPatterns: [],
      ownerStats: {},
      materialsReview: { prepared: [], missing: [] },
      overallNotes: '',
    },
    execution: {
      id: '',
      planId: '',
      planSnapshot: createEmptyPlan(0),
      currentIndex: 0,
      items: [],
      status: 'ready',
      startedAt: 0,
      totalPausedDuration: 0,
    },
    createdAt: now,
    updatedAt: now,
  };
}
