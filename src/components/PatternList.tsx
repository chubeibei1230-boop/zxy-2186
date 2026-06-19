import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
} from '@dnd-kit/sortable';
import { PaperPattern, STATUS_COLORS, DIFFICULTY_COLORS, PracticeStatus, STATUS_OPTIONS } from '../types';
import { GripVertical, Copy, Trash2, CheckCircle, Circle } from 'lucide-react';

interface PatternListProps {
  patterns: PaperPattern[];
  selectedIds: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onDelete: (id: string) => void;
  onCopy: (pattern: PaperPattern) => void;
  onReorder: (ids: string[]) => void;
  onChangeStatus: (id: string, status: PracticeStatus) => void;
  inPlanScope?: boolean;
}

export default function PatternList(props: PatternListProps) {
  const { patterns, selectedIds, selectedId, onSelect, onToggleSelect, onToggleSelectAll, onDelete, onCopy, onReorder, onChangeStatus, inPlanScope } = props;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const ids = patterns.map(p => p.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      const newIds = [...ids];
      const [removed] = newIds.splice(oldIndex, 1);
      newIds.splice(newIndex, 0, removed);
      onReorder(newIds);
    }
  };

  const allSelected = patterns.length > 0 && patterns.every(p => selectedIds.has(p.id));
  const totalDuration = patterns.reduce((s, p) => s + (p.estimatedDuration || 0), 0);

  return (
    <div className="pattern-list-wrapper">
      <div className="pattern-list-header">
        <div className="list-header-left">
          <span className="checkbox-wrapper" onClick={e => e.stopPropagation()}>
            {allSelected ? (
              <CheckCircle size={18} className="check-icon checked" onClick={onToggleSelectAll} />
            ) : (
              <Circle size={18} className="check-icon" onClick={onToggleSelectAll} />
            )}
          </span>
          <span className="list-meta">共 {patterns.length} 项 · 总时长 {totalDuration} 分钟</span>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={patterns.map(p => p.id)} strategy={verticalListSortingStrategy}>
          <div className="pattern-list">
            {patterns.length === 0 ? (
              <div className="empty-state">
                <p>暂无图样数据</p>
                <p className="empty-hint">点击「新增图样」按钮添加第一个练习内容</p>
              </div>
            ) : (
              patterns.map((p, idx) => (
                <SortableItem
                  key={p.id}
                  pattern={p}
                  index={idx}
                  isSelected={selectedIds.has(p.id)}
                  isActive={selectedId === p.id}
                  onSelect={onSelect}
                  onToggleSelect={onToggleSelect}
                  onDelete={onDelete}
                  onCopy={onCopy}
                  onChangeStatus={onChangeStatus}
                  inPlanScope={inPlanScope}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

interface SortableItemProps {
  pattern: PaperPattern;
  index: number;
  isSelected: boolean;
  isActive: boolean;
  onSelect: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCopy: (pattern: PaperPattern) => void;
  onChangeStatus: (id: string, status: PracticeStatus) => void;
  inPlanScope?: boolean;
}

function SortableItem(props: SortableItemProps) {
  const { pattern, index, isSelected, isActive, onSelect, onToggleSelect, onDelete, onCopy, onChangeStatus, inPlanScope } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pattern.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-id={pattern.id}
      className={`pattern-item ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(pattern.id)}
    >
      <div className="item-order">
        <div className="drag-handle" {...attributes} {...listeners}>
          <GripVertical size={16} />
        </div>
        <span className="order-num">{index + 1}</span>
      </div>

      <div className="item-select" onClick={e => e.stopPropagation()}>
        {isSelected ? (
          <CheckCircle size={18} className="check-icon checked" onClick={() => onToggleSelect(pattern.id)} />
        ) : (
          <Circle size={18} className="check-icon" onClick={() => onToggleSelect(pattern.id)} />
        )}
      </div>

      <div className="item-main">
        <div className="item-title-row">
          <span className="item-name">{pattern.name || <em className="untitled">未命名图样</em>}</span>
          <span className="item-tags">
            {pattern.theme && (
              <span className="tag tag-theme">{pattern.theme}</span>
            )}
            <span className="tag" style={{ backgroundColor: DIFFICULTY_COLORS[pattern.difficulty] + '22', color: DIFFICULTY_COLORS[pattern.difficulty] }}>
              {pattern.difficulty}
            </span>
            <span className="tag tag-duration">{pattern.estimatedDuration}分钟</span>
            {pattern.suitablePeople && (
              <span className="tag tag-people">{pattern.suitablePeople}</span>
            )}
          </span>
        </div>
        {pattern.owner && <div className="item-meta">负责人：{pattern.owner}</div>}
      </div>

      <div className="item-status" onClick={e => e.stopPropagation()}>
        <select
          value={pattern.status}
          onChange={e => onChangeStatus(pattern.id, e.target.value as PracticeStatus)}
          style={{ borderColor: STATUS_COLORS[pattern.status], color: STATUS_COLORS[pattern.status] }}
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="item-actions" onClick={e => e.stopPropagation()}>
        <button className="icon-btn" title="复制配置" onClick={() => onCopy(pattern)}>
          <Copy size={16} />
        </button>
        <button
          className={`icon-btn ${inPlanScope ? '' : 'danger'}`}
          title={inPlanScope ? '从方案中移除' : '删除（从图样库中永久删除）'}
          onClick={() => onDelete(pattern.id)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
