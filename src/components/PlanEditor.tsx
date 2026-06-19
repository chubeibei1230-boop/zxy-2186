import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PracticePlan, PaperPattern, DIFFICULTY_COLORS, createEmptyPlan } from '../types';
import {
  Plus, Trash2, X, GripVertical, Search, Clock, Users, User,
  FolderKanban, AlertTriangle, CheckCircle2, AlertCircle, ChevronDown, ChevronRight,
} from 'lucide-react';

interface PlanEditorProps {
  plan: PracticePlan | null;
  allPatterns: PaperPattern[];
  onChange: (plan: PracticePlan) => void;
  onClose?: () => void;
  onCreateNew?: () => void;
}

type PatternStatus = 'active' | 'modified' | 'deleted';

interface ResolvedPattern {
  patternId: string;
  pattern: PaperPattern | null;
  snapshot: PaperPattern | null;
  status: PatternStatus;
  addedAt: number;
}

export default function PlanEditor({ plan, allPatterns, onChange, onClose, onCreateNew }: PlanEditorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerKeyword, setPickerKeyword] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const resolvedItems: ResolvedPattern[] = useMemo(() => {
    if (!plan) return [];
    return plan.items.map(item => {
      const current = allPatterns.find(p => p.id === item.patternId) || null;
      let status: PatternStatus = 'active';
      if (!current) {
        status = 'deleted';
      } else if (item.snapshot && item.snapshot.updatedAt < current.updatedAt) {
        status = 'modified';
      }
      return {
        patternId: item.patternId,
        pattern: current,
        snapshot: item.snapshot || null,
        status,
        addedAt: item.addedAt,
      };
    });
  }, [plan, allPatterns]);

  const availablePatterns = useMemo(() => {
    const addedIds = new Set(plan?.items.map(i => i.patternId) || []);
    const kw = pickerKeyword.trim().toLowerCase();
    return allPatterns
      .filter(p => !addedIds.has(p.id))
      .filter(p => {
        if (!kw) return true;
        const text = `${p.name} ${p.theme} ${p.knifeTechniques} ${p.foldingMethod}`.toLowerCase();
        return text.includes(kw);
      });
  }, [plan, allPatterns, pickerKeyword]);

  if (!plan) {
    return (
      <div className="plan-editor">
        <div className="editor-header">
          <h3>练习方案管理</h3>
          {onClose && (
            <button className="icon-btn" onClick={onClose}>
              <X size={18} />
            </button>
          )}
        </div>
        <div className="editor-body">
          <div className="empty-detail">
            <FolderKanban size={64} className="empty-icon" />
            <h3>请从左侧选择或创建一个方案</h3>
            <p>方案可以把多个图样组合成一次活动或一节课的内容</p>
            {onCreateNew && (
              <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onCreateNew}>
                <Plus size={16} /> 新建方案
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const update = (patch: Partial<PracticePlan>) => {
    onChange({ ...plan, ...patch });
  };

  const handleAddPattern = (pattern: PaperPattern) => {
    const newItem = {
      patternId: pattern.id,
      snapshot: { ...pattern },
      addedAt: Date.now(),
    };
    update({ items: [...plan.items, newItem] });
  };

  const handleRemovePattern = (patternId: string) => {
    update({ items: plan.items.filter(i => i.patternId !== patternId) });
  };

  const handleRefreshSnapshot = (patternId: string) => {
    const pattern = allPatterns.find(p => p.id === patternId);
    if (!pattern) return;
    update({
      items: plan.items.map(i =>
        i.patternId === patternId ? { ...i, snapshot: { ...pattern } } : i
      ),
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const ids = plan.items.map(i => i.patternId);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      const newItems = [...plan.items];
      const [removed] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, removed);
      update({ items: newItems });
    }
  };

  const totalDuration = resolvedItems.reduce((s, r) => {
    const p = r.pattern || r.snapshot;
    return s + (p?.estimatedDuration || 0);
  }, 0);

  return (
    <div className="plan-editor">
      <div className="editor-header">
        <h3>
          <FolderKanban size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} />
          方案编辑
        </h3>
        {onClose && (
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        )}
      </div>

      <div className="editor-body">
        <div className="form-row">
          <div className="form-field">
            <label>方案名称 *</label>
            <input
              type="text"
              value={plan.name}
              placeholder="如：2025暑期剪纸入门班"
              onChange={e => update({ name: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row grid-3">
          <div className="form-field">
            <label>适用场景</label>
            <input
              type="text"
              value={plan.scenario}
              placeholder="如：兴趣班、体验课、社团活动"
              onChange={e => update({ scenario: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>
              <Clock size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 3 }} />
              预计总时长说明
            </label>
            <input
              type="text"
              value={plan.estimatedDuration}
              placeholder="如：2课时（90分钟）"
              onChange={e => update({ estimatedDuration: e.target.value })}
            />
            <span className="field-hint">已选内容累计：{totalDuration} 分钟</span>
          </div>
          <div className="form-field">
            <label>
              <User size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 3 }} />
              负责人
            </label>
            <input
              type="text"
              value={plan.owner}
              placeholder="本次活动主要负责人"
              onChange={e => update({ owner: e.target.value })}
            />
          </div>
        </div>

        <div className="section-block">
          <div className="section-header">
            <h4>
              方案内图样
              <span className="plan-count-badge">{resolvedItems.length} 项</span>
            </h4>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-small" onClick={() => setShowPicker(v => !v)}>
                {showPicker ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {showPicker ? '收起选择器' : '选择图样'}
              </button>
              <button className="btn btn-small btn-primary" onClick={() => setShowPicker(true)}>
                <Plus size={14} /> 添加图样
              </button>
            </div>
          </div>

          {showPicker && (
            <div className="pattern-picker">
              <div className="picker-search">
                <Search size={14} className="picker-search-icon" />
                <input
                  type="text"
                  placeholder="搜索图样名称、主题..."
                  value={pickerKeyword}
                  onChange={e => setPickerKeyword(e.target.value)}
                />
              </div>
              <div className="picker-list">
                {availablePatterns.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 12px' }}>
                    <p>无可选图样</p>
                    <p className="empty-hint">所有图样均已添加或尚未创建图样</p>
                  </div>
                ) : (
                  availablePatterns.map(p => (
                    <div key={p.id} className="picker-item">
                      <div className="picker-item-main">
                        <div className="picker-item-name">{p.name || <em className="untitled">未命名图样</em>}</div>
                        <div className="picker-item-tags">
                          {p.theme && <span className="tag tag-theme">{p.theme}</span>}
                          <span className="tag" style={{ backgroundColor: DIFFICULTY_COLORS[p.difficulty] + '22', color: DIFFICULTY_COLORS[p.difficulty] }}>
                            {p.difficulty}
                          </span>
                          <span className="tag tag-duration">{p.estimatedDuration}分钟</span>
                        </div>
                      </div>
                      <button className="btn btn-small btn-primary" onClick={() => handleAddPattern(p)}>
                        <Plus size={14} /> 添加
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {resolvedItems.length === 0 ? (
            <div className="empty-state" style={{ padding: '36px 12px' }}>
              <p>方案内暂无内容</p>
              <p className="empty-hint">点击「添加图样」从现有图样中选择</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={resolvedItems.map(r => r.patternId)} strategy={verticalListSortingStrategy}>
                <div className="plan-pattern-list">
                  {resolvedItems.map((r, idx) => (
                    <SortablePlanItem
                      key={r.patternId}
                      index={idx}
                      resolved={r}
                      onRemove={() => handleRemovePattern(r.patternId)}
                      onRefresh={() => handleRefreshSnapshot(r.patternId)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}

interface SortablePlanItemProps {
  index: number;
  resolved: ResolvedPattern;
  onRemove: () => void;
  onRefresh: () => void;
}

function SortablePlanItem({ index, resolved, onRemove, onRefresh }: SortablePlanItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: resolved.patternId });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const display = resolved.pattern || resolved.snapshot;

  const statusInfo = {
    active: { label: '正常', icon: <CheckCircle2 size={14} />, color: 'var(--success)', bg: '#dcfce7' },
    modified: { label: '已更新', icon: <AlertCircle size={14} />, color: 'var(--warning)', bg: '#fef3c7' },
    deleted: { label: '已删除', icon: <AlertTriangle size={14} />, color: 'var(--danger)', bg: '#fee2e2' },
  }[resolved.status];

  return (
    <div ref={setNodeRef} style={style} className={`plan-pattern-item ${resolved.status !== 'active' ? 'has-status' : ''}`}>
      <div className="plan-pattern-left">
        <div className="drag-handle" {...attributes} {...listeners}>
          <GripVertical size={14} />
        </div>
        <span className="order-num">{index + 1}</span>
      </div>

      <div className="plan-pattern-main">
        <div className="plan-pattern-title-row">
          <span className="plan-pattern-name">
            {display?.name || <em className="untitled">未命名图样</em>}
            {resolved.status === 'deleted' && resolved.snapshot && (
              <span className="pattern-deleted-hint">（使用快照内容）</span>
            )}
          </span>
          <span
            className="pattern-status-pill"
            style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
            title={
              resolved.status === 'modified'
                ? '原始图样已更新，可刷新同步'
                : resolved.status === 'deleted'
                ? '原始图样已删除，使用添加时的快照'
                : '内容正常'
            }
          >
            {statusInfo.icon}
            {statusInfo.label}
          </span>
        </div>
        <div className="plan-pattern-tags">
          {display?.theme && <span className="tag tag-theme">{display.theme}</span>}
          {display && (
            <span className="tag" style={{ backgroundColor: DIFFICULTY_COLORS[display.difficulty] + '22', color: DIFFICULTY_COLORS[display.difficulty] }}>
              {display.difficulty}
            </span>
          )}
          <span className="tag tag-duration">{display?.estimatedDuration || 0}分钟</span>
          {display?.suitablePeople && <span className="tag tag-people"><Users size={10} /> {display.suitablePeople}</span>}
        </div>
      </div>

      <div className="plan-pattern-actions">
        {resolved.status === 'modified' && (
          <button className="icon-btn" title="同步最新内容" onClick={onRefresh}>
            <AlertCircle size={14} />
          </button>
        )}
        <button className="icon-btn danger" title="从方案移除" onClick={onRemove}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
