import { useState, useEffect, useCallback, useMemo } from 'react';
import { PaperPattern, FilterState, AppSettings, createEmptyPattern, PracticeStatus, CheckIssue } from './types';
import {
  getAllPatterns, savePattern, savePatternsBulk, deletePattern, deletePatternsBulk,
  saveFilters, loadFilters, saveSettings, loadSettings, saveUIState, loadUIState,
} from './db';
import { runChecks } from './checks';
import FilterBar from './components/FilterBar';
import PatternList from './components/PatternList';
import PatternEditor from './components/PatternEditor';
import IssuesPanel from './components/IssuesPanel';
import BulkActionsBar from './components/BulkActionsBar';
import PracticePreview from './components/PracticePreview';
import SettingsPanel from './components/SettingsPanel';
import { Plus, Play, Settings as SettingsIcon, Scissors, RotateCcw, ClipboardCopy } from 'lucide-react';

const DEFAULT_FILTERS: FilterState = {
  keyword: '',
  theme: '',
  difficulty: '',
  status: '',
  owner: '',
};

export default function App() {
  const [patterns, setPatterns] = useState<PaperPattern[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [settings, setSettings] = useState<AppSettings>({ totalDurationLimit: 180, maxItemsPerOwner: 5 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const [loadedPatterns, loadedFilters, loadedSettings, uiState] = await Promise.all([
        getAllPatterns(),
        loadFilters(),
        loadSettings(),
        loadUIState(),
      ]);
      setPatterns(loadedPatterns);
      if (loadedFilters) setFilters(loadedFilters);
      setSettings(loadedSettings);
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

  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (selectedId) saveUIState('selectedId', selectedId);
  }, [selectedId]);

  const filteredPatterns = useMemo(() => {
    const kw = filters.keyword.trim().toLowerCase();
    return patterns.filter(p => {
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
  }, [patterns, filters]);

  const themes = useMemo(() => {
    const set = new Set<string>();
    patterns.forEach(p => p.theme && set.add(p.theme));
    return Array.from(set);
  }, [patterns]);

  const owners = useMemo(() => {
    const set = new Set<string>();
    patterns.forEach(p => p.owner && set.add(p.owner));
    return Array.from(set);
  }, [patterns]);

  const issues: CheckIssue[] = useMemo(() => runChecks(patterns, settings), [patterns, settings]);

  const selectedPattern = useMemo(() => {
    if (!selectedId) return null;
    return patterns.find(p => p.id === selectedId) || null;
  }, [patterns, selectedId]);

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
        materials: sourcePattern.materials.map(m => ({
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
    setSelectedId(newPattern.id);
  }, [patterns, persistPattern]);

  const copyLastPattern = useCallback(() => {
    if (patterns.length === 0) {
      addPattern();
      return;
    }
    const sorted = [...patterns].sort((a, b) => a.order - b.order);
    addPattern(sorted[sorted.length - 1]);
  }, [patterns, addPattern]);

  const removePattern = useCallback(async (id: string) => {
    if (!confirm('确定删除该图样吗？此操作不可恢复。')) return;
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
    if (!confirm(`确定删除已选中的 ${selectedIds.size} 个图样吗？此操作不可恢复。`)) return;
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
      {
        id: `demo_5_${now}`, order: maxOrder + 4,
        name: '连年有余', theme: '新春', foldingMethod: '对折',
        knifeTechniques: '鱼鳞用半圆形排列，水纹用波浪线',
        estimatedDuration: 50, suitablePeople: '2人', riskWarnings: '细小鱼鳞处需特别小心',
        backupPlan: '', status: '暂缓', difficulty: '中级', owner: '王老师',
        steps: [],
        materials: [
          { id: `q1_${now}`, name: '红色宣纸', quantity: '2张' },
          { id: `q2_${now}`, name: '刻刀套装', quantity: '1套' },
          { id: `q3_${now}`, name: '镊子', quantity: '1个', note: '剔除碎纸片' },
        ],
        notes: '莲花和鲤鱼组合', createdAt: now, updatedAt: now,
      },
      {
        id: `demo_4_${now}`, order: maxOrder + 5,
        name: '生肖老虎', theme: '生肖', foldingMethod: '对称折',
        knifeTechniques: '毛发处使用短碎线阴刻，眼睛保留小圆点',
        estimatedDuration: 90, suitablePeople: '3人', riskWarnings: '细节较多，建议准备放大镜',
        backupPlan: '简化为剪影风格', status: '需协助', difficulty: '高级', owner: '王老师',
        steps: [],
        materials: [
          { id: `r1_${now}`, name: '双面红宣', quantity: '3张' },
          { id: `r2_${now}`, name: '精细刻刀', quantity: '2把' },
          { id: `r3_${now}`, name: '放大镜', quantity: '1个' },
          { id: `r4_${now}`, name: 'LED灯台', quantity: '1台', note: '看稿辅助' },
        ],
        notes: '适合作为进阶练习', createdAt: now, updatedAt: now,
      },
    ];
    setPatterns(prev => [...prev, ...demo].sort((a, b) => a.order - b.order));
    await savePatternsBulk(demo);
    setSelectedId(demo[0].id);
  }, [patterns]);

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

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <Scissors size={24} className="title-icon" />
          <div>
            <h1>剪纸图样练习管理</h1>
            <p className="subtitle">难度安排 · 材料核对 · 进度提示</p>
          </div>
        </div>
        <div className="app-actions">
          <button className="btn" onClick={() => addPattern()}>
            <Plus size={16} /> 新增图样
          </button>
          <button className="btn btn-secondary" onClick={copyLastPattern}>
            <ClipboardCopy size={16} /> 复制上一条
          </button>
          <button className="btn btn-secondary" onClick={() => setShowPreview(true)}>
            <Play size={16} /> 练习顺序预览
          </button>
          <button className="btn btn-ghost" onClick={handleResetDemo}>
            <RotateCcw size={16} /> 加载示例
          </button>
          <button className="btn btn-ghost" onClick={() => setShowSettings(true)}>
            <SettingsIcon size={16} /> 设置
          </button>
        </div>
      </header>

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
            onDelete={removePattern}
            onCopy={addPattern}
            onReorder={handleReorder}
            onChangeStatus={handleStatusChange}
          />
        </div>
        <div className="main-right">
          {selectedPattern ? (
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
        <PracticePreview patterns={filteredPatterns} onClose={() => setShowPreview(false)} />
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
