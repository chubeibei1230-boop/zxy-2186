import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PaperPattern, FilterState, AppSettings, createEmptyPattern, PracticeStatus, CheckIssue,
  PracticePlan, createEmptyPlan, PracticeExecution, createExecution, ReviewRecord, ReviewSummary,
} from './types';
import {
  getAllPatterns, savePattern, savePatternsBulk, deletePattern, deletePatternsBulk,
  saveFilters, loadFilters, saveSettings, loadSettings, saveUIState, loadUIState,
  getAllPlans, savePlan, savePlansBulk, deletePlan,
  getAllReviews, saveReview, deleteReview,
} from './db';
import { runChecks } from './checks';
import { generateReviewSummary } from './reviewUtils';
import FilterBar from './components/FilterBar';
import PatternList from './components/PatternList';
import PatternEditor from './components/PatternEditor';
import IssuesPanel from './components/IssuesPanel';
import BulkActionsBar from './components/BulkActionsBar';
import PracticePreview from './components/PracticePreview';
import SettingsPanel from './components/SettingsPanel';
import PlanList from './components/PlanList';
import PlanEditor from './components/PlanEditor';
import PracticeExecutionComponent from './components/PracticeExecution';
import ReviewDetail from './components/ReviewDetail';
import ReviewList from './components/ReviewList';
import {
  Plus, Play, Settings as SettingsIcon, Scissors, RotateCcw, ClipboardCopy,
  FolderOpen, X, Edit3, FileText, PlayCircle,
} from 'lucide-react';

const DEFAULT_FILTERS: FilterState = {
  keyword: '',
  theme: '',
  difficulty: '',
  status: '',
  owner: '',
};

function resolvePlanPatterns(plan: PracticePlan, allPatterns: PaperPattern[]): PaperPattern[] {
  const result: PaperPattern[] = [];
  for (const item of plan.items) {
    const current = allPatterns.find(p => p.id === item.patternId);
    if (current) {
      result.push(current);
    } else if (item.snapshot) {
      result.push(item.snapshot);
    }
  }
  return result;
}

export default function App() {
  const [patterns, setPatterns] = useState<PaperPattern[]>([]);
  const [plans, setPlans] = useState<PracticePlan[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showPlanPanel, setShowPlanPanel] = useState(false);
  const [showPlanEditor, setShowPlanEditor] = useState(false);
  const [showReviewList, setShowReviewList] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [settings, setSettings] = useState<AppSettings>({ totalDurationLimit: 180, maxItemsPerOwner: 5 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentExecution, setCurrentExecution] = useState<PracticeExecution | null>(null);
  const [showExecution, setShowExecution] = useState(false);
  const [currentReviewSummary, setCurrentReviewSummary] = useState<ReviewSummary | null>(null);
  const [showReviewDetail, setShowReviewDetail] = useState(false);
  const [viewingReview, setViewingReview] = useState<ReviewRecord | null>(null);

  useEffect(() => {
    const init = async () => {
      const [loadedPatterns, loadedPlans, loadedReviews, loadedFilters, loadedSettings, uiState] = await Promise.all([
        getAllPatterns(),
        getAllPlans(),
        getAllReviews(),
        loadFilters(),
        loadSettings(),
        loadUIState(),
      ]);
      setPatterns(loadedPatterns);
      setPlans(loadedPlans);
      setReviews(loadedReviews);
      if (loadedFilters) setFilters(loadedFilters);
      setSettings(loadedSettings);

      const savedPlanId = uiState.selectedPlanId as string | undefined;
      if (savedPlanId && loadedPlans.find(p => p.id === savedPlanId)) {
        setSelectedPlanId(savedPlanId);
      }

      if (loadedPatterns.length > 0) {
        const savedSelected = uiState.selectedId as string | undefined;
        if (savedSelected && loadedPatterns.find(p => p.id === savedSelected)) {
          setSelectedId(savedSelected);
        } else {
          setSelectedId(loadedPatterns[0].id);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => { saveFilters(filters); }, [filters]);
  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { if (selectedId) saveUIState('selectedId', selectedId); }, [selectedId]);
  useEffect(() => { saveUIState('selectedPlanId', selectedPlanId); }, [selectedPlanId]);

  const currentPlan = useMemo(
    () => (selectedPlanId ? plans.find(p => p.id === selectedPlanId) || null : null),
    [plans, selectedPlanId]
  );

  const scopedPatterns: PaperPattern[] = useMemo(() => {
    if (currentPlan) {
      return resolvePlanPatterns(currentPlan, patterns);
    }
    return patterns;
  }, [currentPlan, patterns]);

  const filteredPatterns = useMemo(() => {
    const kw = filters.keyword.trim().toLowerCase();
    return scopedPatterns.filter(p => {
      if (filters.theme && p.theme !== filters.theme) return false;
      if (filters.difficulty && p.difficulty !== filters.difficulty) return false;
      if (filters.status && p.status !== filters.status) return false;
      if (filters.owner && p.owner !== filters.owner) return false;
      if (kw) {
        const searchText = `${p.name} ${p.knifeTechniques} ${p.foldingMethod} ${p.theme} ${p.notes}`.toLowerCase();
        if (!searchText.includes(kw)) return false;
      }
      return true;
    });
  }, [scopedPatterns, filters]);

  const themes = useMemo(() => {
    const set = new Set<string>();
    scopedPatterns.forEach(p => p.theme && set.add(p.theme));
    return Array.from(set);
  }, [scopedPatterns]);

  const owners = useMemo(() => {
    const set = new Set<string>();
    scopedPatterns.forEach(p => p.owner && set.add(p.owner));
    return Array.from(set);
  }, [scopedPatterns]);

  const issues: CheckIssue[] = useMemo(
    () => runChecks(scopedPatterns, settings),
    [scopedPatterns, settings]
  );

  const selectedPattern = useMemo(() => {
    if (!selectedId) return null;
    return scopedPatterns.find(p => p.id === selectedId) || null;
  }, [scopedPatterns, selectedId]);

  const removePatternFromPlan = useCallback(async (patternId: string) => {
    if (!currentPlan) return;
    if (!confirm('确定从当前方案中移除此图样吗？（不会删除图样库中的原始内容）')) return;
    const updated = {
      ...currentPlan,
      items: currentPlan.items.filter(i => i.patternId !== patternId),
      updatedAt: Date.now(),
    };
    setPlans(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    await savePlan(updated);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(patternId);
      return next;
    });
    if (selectedId === patternId) {
      const remaining = updated.items
        .map(i => patterns.find(p => p.id === i.patternId) || i.snapshot)
        .filter(Boolean) as PaperPattern[];
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
    }
  }, [currentPlan, selectedId, patterns]);

  const persistPattern = useCallback(async (pattern: PaperPattern) => {
    setPatterns(prev => {
      const next = prev.map(p => (p.id === pattern.id ? pattern : p));
      if (!prev.find(p => p.id === pattern.id)) {
        next.push(pattern);
      }
      return next.sort((a, b) => a.order - b.order);
    });
    await savePattern(pattern);
  }, []);

  const addPattern = useCallback(async (sourcePattern?: PaperPattern) => {
    const maxOrder = patterns.reduce((m, p) => Math.max(m, p.order), 0);
    let newPattern: PaperPattern;
    if (sourcePattern) {
      const now = Date.now();
      newPattern = {
        ...sourcePattern,
        id: `pattern_${now}_${Math.random().toString(36).slice(2, 9)}`,
        order: maxOrder + 1,
        name: sourcePattern.name ? `${sourcePattern.name} (副本)` : '',
        status: '待讲解',
        steps: sourcePattern.steps.map(s => ({
          ...s,
          id: `step_${now}_${Math.random().toString(36).slice(2, 7)}`,
        })),
        materials: (sourcePattern.materials || []).map(m => ({
          ...m,
          id: `mat_${now}_${Math.random().toString(36).slice(2, 7)}`,
        })),
        createdAt: now,
        updatedAt: now,
      };
    } else {
      newPattern = createEmptyPattern(maxOrder + 1);
    }
    await persistPattern(newPattern);

    if (currentPlan) {
      const updatedPlan = {
        ...currentPlan,
        items: [
          ...currentPlan.items,
          {
            patternId: newPattern.id,
            snapshot: { ...newPattern },
            addedAt: Date.now(),
          },
        ],
        updatedAt: Date.now(),
      };
      setPlans(prev => prev.map(p => (p.id === updatedPlan.id ? updatedPlan : p)));
      await savePlan(updatedPlan);
    }

    setSelectedId(newPattern.id);
  }, [patterns, persistPattern, currentPlan]);

  const copyLastPattern = useCallback(() => {
    if (patterns.length === 0) {
      addPattern();
      return;
    }
    const sorted = [...patterns].sort((a, b) => a.order - b.order);
    addPattern(sorted[sorted.length - 1]);
  }, [patterns, addPattern]);

  const removePattern = useCallback(async (id: string) => {
    if (!confirm('确定删除该图样吗？方案中若引用此图样会保留其快照。')) return;
    await deletePattern(id);
    setPatterns(prev => prev.filter(p => p.id !== id).map((p, i) => ({ ...p, order: i + 1 })));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (selectedId === id) {
      const remaining = patterns.filter(p => p.id !== id);
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
    }
    const reordered = patterns.filter(p => p.id !== id).map((p, i) => ({ ...p, order: i + 1 }));
    if (reordered.length > 0) await savePatternsBulk(reordered);
  }, [patterns, selectedId]);

  const handleReorder = useCallback(async (filteredIds: string[]) => {
    const allSorted = [...patterns].sort((a, b) => a.order - b.order);
    const filteredSet = new Set(filteredIds);
    const hiddenItems = allSorted.filter(p => !filteredSet.has(p.id));

    let filteredIdx = 0;
    let hiddenIdx = 0;
    const result: PaperPattern[] = [];

    for (const original of allSorted) {
      if (filteredSet.has(original.id)) {
        const nextId = filteredIds[filteredIdx++];
        const found = allSorted.find(p => p.id === nextId)!;
        result.push(found);
      } else {
        result.push(hiddenItems[hiddenIdx++]);
      }
    }

    const updated = result.map((p, i) => ({ ...p, order: i + 1 }));
    setPatterns(updated);
    await savePatternsBulk(updated);
  }, [patterns]);

  const handleStatusChange = useCallback(async (id: string, status: PracticeStatus) => {
    const pattern = patterns.find(p => p.id === id);
    if (!pattern) return;
    const updated = { ...pattern, status };
    await persistPattern(updated);
  }, [patterns, persistPattern]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredPatterns.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPatterns.map(p => p.id)));
    }
  }, [filteredPatterns, selectedIds.size]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const batchStatus = useCallback(async (status: PracticeStatus) => {
    const ids = Array.from(selectedIds);
    const updated = patterns
      .filter(p => ids.includes(p.id))
      .map(p => ({ ...p, status }));
    setPatterns(prev => prev.map(p => ids.includes(p.id) ? { ...p, status } : p));
    await savePatternsBulk(updated);
  }, [patterns, selectedIds]);

  const batchDelete = useCallback(async () => {
    if (!confirm(`确定删除已选中的 ${selectedIds.size} 个图样吗？方案中的引用将保留快照。`)) return;
    const ids = Array.from(selectedIds);
    await deletePatternsBulk(ids);
    const remaining = patterns.filter(p => !ids.includes(p.id)).map((p, i) => ({ ...p, order: i + 1 }));
    setPatterns(remaining);
    if (selectedId && ids.includes(selectedId)) {
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
    }
    setSelectedIds(new Set());
    if (remaining.length > 0) await savePatternsBulk(remaining);
  }, [patterns, selectedIds, selectedId]);

  const handleHighlight = useCallback((ids: string[]) => {
    setHighlightedIds(new Set(ids));
    if (ids.length > 0) {
      setSelectedId(ids[0]);
    }
    setTimeout(() => setHighlightedIds(new Set()), 2500);
  }, []);

  const handleResetDemo = useCallback(async () => {
    if (!confirm('将加载示例数据，是否继续？（当前数据将被保留，示例添加在末尾）')) return;
    const maxOrder = patterns.reduce((m, p) => Math.max(m, p.order), 0);
    const now = Date.now();
    const demo: PaperPattern[] = [
      {
        id: `demo_1_${now}`, order: maxOrder + 1,
        name: '双喜字', theme: '婚庆', foldingMethod: '对折两次后再对折一次',
        knifeTechniques: '阴刻为主，线条平直，笔画连接处需留边',
        estimatedDuration: 45, suitablePeople: '2人', riskWarnings: '注意刀刃方向，手指放在切割线后方',
        backupPlan: '如时间不足可改用剪子代替刻刀', status: '待讲解', difficulty: '初级', owner: '李老师',
        steps: [
          { id: `s1_${now}`, title: '备料', description: '准备20x20cm红色宣纸一张' },
          { id: `s2_${now}`, title: '折叠', description: '沿对角线对折，再沿中线对折两次' },
          { id: `s3_${now}`, title: '画稿', description: '用铅笔描出喜字轮廓，注意对称' },
          { id: `s4_${now}`, title: '刻制', description: '先刻内部再刻外部，保持线条流畅' },
        ],
        materials: [
          { id: `m1_${now}`, name: '红色宣纸', quantity: '1张', note: '20×20cm' },
          { id: `m2_${now}`, name: '剪纸刻刀', quantity: '1把' },
          { id: `m3_${now}`, name: '切割垫板', quantity: '1块' },
          { id: `m4_${now}`, name: '铅笔', quantity: '1支' },
          { id: `m5_${now}`, name: '橡皮', quantity: '1块' },
        ],
        notes: '建议使用红宣，效果最佳', createdAt: now, updatedAt: now,
      },
      {
        id: `demo_2_${now}`, order: maxOrder + 2,
        name: '团花-牡丹', theme: '花鸟', foldingMethod: '五角折叠法',
        knifeTechniques: '阴阳结合，花瓣边缘用月牙纹',
        estimatedDuration: 60, suitablePeople: '3-4人小组', riskWarnings: '折叠层数多，注意下刀力度均匀，避免裁透垫板',
        backupPlan: '改用六角折叠简化图案', status: '练习中', difficulty: '中级', owner: '王老师',
        steps: [
          { id: `t1_${now}`, title: '折叠', description: '圆形纸张进行五角折叠' },
          { id: `t2_${now}`, title: '构图', description: '画出牡丹花瓣和叶子分布' },
          { id: `t3_${now}`, title: '细化', description: '添加叶脉和纹理细节' },
        ],
        materials: [
          { id: `n1_${now}`, name: '彩色宣纸', quantity: '3张', note: '圆形直径25cm' },
          { id: `n2_${now}`, name: '剪刀', quantity: '2把' },
          { id: `n3_${now}`, name: '圆规', quantity: '1个', note: '画圆形辅助线' },
        ],
        notes: '可配合染色工艺', createdAt: now, updatedAt: now,
      },
      {
        id: `demo_3_${now}`, order: maxOrder + 3,
        name: '福字斗方', theme: '新春', foldingMethod: '对角折',
        knifeTechniques: '阳刻线条，转折处注意圆润',
        estimatedDuration: 30, suitablePeople: '1-2人', riskWarnings: '',
        backupPlan: '', status: '可展示', difficulty: '入门', owner: '李老师',
        steps: [
          { id: `u1_${now}`, title: '准备方形纸张', description: '选择正方形红色宣纸' },
          { id: `u2_${now}`, title: '打印或描出福字', description: '按对角线方向描出福字轮廓' },
          { id: `u3_${now}`, title: '沿边剪裁', description: '使用剪刀沿线条仔细裁剪' },
        ],
        materials: [
          { id: `p1_${now}`, name: '红宣斗方', quantity: '2张', note: '34×34cm' },
          { id: `p2_${now}`, name: '剪刀', quantity: '1把' },
        ],
        notes: '', createdAt: now, updatedAt: now,
      },
    ];
    setPatterns(prev => [...prev, ...demo].sort((a, b) => a.order - b.order));
    await savePatternsBulk(demo);
    setSelectedId(demo[0].id);
  }, [patterns]);

  const persistPlan = useCallback(async (plan: PracticePlan) => {
    setPlans(prev => {
      const next = prev.map(p => (p.id === plan.id ? plan : p));
      if (!prev.find(p => p.id === plan.id)) {
        next.push(plan);
      }
      return next.sort((a, b) => a.order - b.order);
    });
    await savePlan(plan);
  }, []);

  const addPlan = useCallback(async () => {
    const maxOrder = plans.reduce((m, p) => Math.max(m, p.order), 0);
    const newPlan = createEmptyPlan(maxOrder + 1);
    newPlan.name = `新方案 ${maxOrder + 1}`;
    await persistPlan(newPlan);
    setSelectedPlanId(newPlan.id);
    setShowPlanEditor(true);
    setShowPlanPanel(false);
  }, [plans, persistPlan]);

  const removePlan = useCallback(async (id: string) => {
    if (!confirm('确定删除此方案吗？仅删除方案组合，不会删除关联的图样。')) return;
    await deletePlan(id);
    setPlans(prev => prev.filter(p => p.id !== id).map((p, i) => ({ ...p, order: i + 1 })));
    if (selectedPlanId === id) {
      setSelectedPlanId(null);
    }
    const reordered = plans.filter(p => p.id !== id).map((p, i) => ({ ...p, order: i + 1 }));
    if (reordered.length > 0) await savePlansBulk(reordered);
  }, [plans, selectedPlanId]);

  const handleSelectPlan = useCallback((id: string | null) => {
    setSelectedPlanId(id);
    setSelectedIds(new Set());
    setShowPlanEditor(false);
    if (id) {
      const plan = plans.find(p => p.id === id);
      if (plan && plan.items.length > 0) {
        const firstResolved = resolvePlanPatterns(plan, patterns);
        if (firstResolved.length > 0) {
          setSelectedId(firstResolved[0].id);
          return;
        }
      }
    }
    if (patterns.length > 0) {
      setSelectedId(patterns[0].id);
    } else {
      setSelectedId(null);
    }
  }, [plans, patterns]);

  const startExecution = useCallback(() => {
    if (!currentPlan) return;
    if (currentPlan.items.length === 0) {
      alert('当前方案没有内容，请先添加图样。');
      return;
    }
    const planPatterns = resolvePlanPatterns(currentPlan, patterns);
    const execution = createExecution(currentPlan, planPatterns);
    setCurrentExecution(execution);
    setShowExecution(true);
  }, [currentPlan, patterns]);

  const handleExecutionUpdate = useCallback((execution: PracticeExecution) => {
    setCurrentExecution(execution);
  }, []);

  const handleExecutionComplete = useCallback((execution: PracticeExecution) => {
    setCurrentExecution(execution);
    setShowExecution(false);
    const summary = generateReviewSummary(execution);
    setCurrentReviewSummary(summary);
    setViewingReview(null);
    setShowReviewDetail(true);
  }, []);

  const handleSaveReview = useCallback(async (record: ReviewRecord) => {
    await saveReview(record);
    const updated = await getAllReviews();
    setReviews(updated);
    setShowReviewDetail(false);
    setCurrentReviewSummary(null);
    setViewingReview(null);
    setCurrentExecution(null);
    alert('复盘记录已保存！');
  }, []);

  const handleViewReview = useCallback((review: ReviewRecord) => {
    setViewingReview(review);
    setCurrentReviewSummary(review.summary);
    setCurrentExecution(review.execution);
    setShowReviewDetail(true);
    setShowReviewList(false);
  }, []);

  const handleDeleteReview = useCallback(async (id: string) => {
    await deleteReview(id);
    const updated = await getAllReviews();
    setReviews(updated);
  }, []);

  const refreshReviews = useCallback(async () => {
    const updated = await getAllReviews();
    setReviews(updated);
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <Scissors size={48} className="loading-icon" />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  const scopeLabel = currentPlan
    ? `方案：${currentPlan.name || '未命名方案'}`
    : '全部图样';

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <Scissors size={24} className="title-icon" />
          <div>
            <h1>剪纸图样练习管理</h1>
            <p className="subtitle">
              难度安排 · 材料核对 · 进度提示
              {currentPlan && (
                <span className="scope-indicator">
                  · {scopeLabel}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="app-actions">
          <button className="btn btn-secondary" onClick={() => setShowPlanPanel(true)}>
            <FolderOpen size={16} /> 方案
            {currentPlan && <span className="btn-count">{currentPlan.items.length}</span>}
          </button>
          <button className="btn btn-secondary" onClick={() => { setShowReviewList(true); refreshReviews(); }}>
            <FileText size={16} /> 复盘记录
            {reviews.length > 0 && <span className="btn-count">{reviews.length}</span>}
          </button>
          <button className="btn" onClick={() => addPattern()}>
            <Plus size={16} /> 新增图样
          </button>
          <button className="btn btn-secondary" onClick={copyLastPattern}>
            <ClipboardCopy size={16} /> 复制上一条
          </button>
          <button className="btn btn-secondary" onClick={() => setShowPreview(true)}>
            <Play size={16} /> 练习顺序预览
          </button>
          {currentPlan && currentPlan.items.length > 0 && (
            <button className="btn btn-primary" onClick={startExecution}>
              <PlayCircle size={16} /> 开始执行
            </button>
          )}
          <button className="btn btn-ghost" onClick={handleResetDemo}>
            <RotateCcw size={16} /> 加载示例
          </button>
          <button className="btn btn-ghost" onClick={() => setShowSettings(true)}>
            <SettingsIcon size={16} /> 设置
          </button>
        </div>
      </header>

      {currentPlan && (
        <div className="scope-bar">
          <div className="scope-bar-left">
            <FolderOpen size={14} />
            <span className="scope-bar-label">当前方案：</span>
            <span className="scope-bar-name">{currentPlan.name || '未命名方案'}</span>
            {currentPlan.scenario && (
              <span className="scope-bar-tag">场景：{currentPlan.scenario}</span>
            )}
            {currentPlan.estimatedDuration && (
              <span className="scope-bar-tag">时长：{currentPlan.estimatedDuration}</span>
            )}
            {currentPlan.owner && (
              <span className="scope-bar-tag">负责人：{currentPlan.owner}</span>
            )}
            <span className="scope-bar-tag">{currentPlan.items.length} 项内容</span>
          </div>
          <div className="scope-bar-right">
            <button className="btn btn-small btn-primary" onClick={startExecution} disabled={currentPlan.items.length === 0}>
              <PlayCircle size={12} /> 开始执行
            </button>
            <button className="btn btn-small" onClick={() => setShowPlanEditor(true)}>
              <Edit3 size={12} /> 编辑方案
            </button>
            <button className="btn btn-small btn-ghost" onClick={() => setSelectedPlanId(null)}>
              退出方案
            </button>
          </div>
        </div>
      )}

      <FilterBar filters={filters} onChange={setFilters} themes={themes} owners={owners} />

      <BulkActionsBar
        selectedCount={selectedIds.size}
        onBatchStatus={batchStatus}
        onBatchDelete={batchDelete}
        onClearSelection={clearSelection}
      />

      {issues.length > 0 && (
        <div style={{ padding: '0 20px' }}>
          <IssuesPanel issues={issues} onHighlight={handleHighlight} />
        </div>
      )}

      <div className="app-main">
        <div className="main-left">
          <PatternList
            patterns={filteredPatterns}
            selectedIds={selectedIds}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onDelete={currentPlan ? removePatternFromPlan : removePattern}
            onCopy={addPattern}
            onReorder={handleReorder}
            onChangeStatus={handleStatusChange}
            inPlanScope={!!currentPlan}
          />
        </div>
        <div className="main-right">
          {showPlanEditor ? (
            <PlanEditor
              plan={currentPlan}
              allPatterns={patterns}
              onChange={persistPlan}
              onClose={() => setShowPlanEditor(false)}
              onCreateNew={addPlan}
            />
          ) : selectedPattern ? (
            <PatternEditor
              pattern={selectedPattern}
              onChange={persistPattern}
            />
          ) : (
            <div className="empty-detail">
              <Scissors size={64} className="empty-icon" />
              <h3>请选择一个图样进行编辑</h3>
              <p>或点击「新增图样」创建新的练习内容</p>
              <button className="btn" style={{ marginTop: 20 }} onClick={() => addPattern()}>
                <Plus size={16} /> 新增图样
              </button>
            </div>
          )}
        </div>
      </div>

      {highlightedIds.size > 0 && (
        <style>{`
          .pattern-item { transition: background-color 0.3s, box-shadow 0.3s; }
          ${Array.from(highlightedIds).map(id => `[data-id="${id}"]`).join(',')} {
            background-color: #fef3c7 !important;
            box-shadow: 0 0 0 2px #f59e0b inset;
          }
        `}</style>
      )}

      {showPreview && (
        <PracticePreview
          patterns={filteredPatterns}
          plan={currentPlan || undefined}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showPlanPanel && (
        <div className="modal-overlay" onClick={() => setShowPlanPanel(false)}>
          <div className="plan-panel-modal" onClick={e => e.stopPropagation()}>
            <PlanList
              plans={plans}
              selectedPlanId={selectedPlanId}
              allViewActive={selectedPlanId === null}
              onSelectPlan={(id) => { handleSelectPlan(id); setShowPlanPanel(false); }}
              onAddPlan={() => { addPlan(); }}
              onDeletePlan={removePlan}
              onClose={() => setShowPlanPanel(false)}
            />
          </div>
        </div>
      )}

      {showExecution && currentExecution && (
        <PracticeExecutionComponent
          execution={currentExecution}
          onUpdate={handleExecutionUpdate}
          onComplete={handleExecutionComplete}
          onClose={() => {
            if (confirm('确定退出执行模式吗？当前进度将丢失。')) {
              setShowExecution(false);
              setCurrentExecution(null);
            }
          }}
        />
      )}

      {showReviewDetail && currentReviewSummary && currentExecution && (
        <ReviewDetail
          summary={currentReviewSummary}
          execution={viewingReview ? viewingReview.execution : currentExecution}
          existingRecord={viewingReview || undefined}
          onSave={handleSaveReview}
          onClose={() => {
            setShowReviewDetail(false);
            setCurrentReviewSummary(null);
            setViewingReview(null);
            setCurrentExecution(null);
          }}
        />
      )}

      {showReviewList && (
        <ReviewList
          reviews={reviews}
          onView={handleViewReview}
          onDelete={handleDeleteReview}
          onClose={() => setShowReviewList(false)}
        />
      )}
    </div>
  );
}
