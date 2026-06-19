import { useState, useEffect, useCallback } from 'react';
import {
  PracticeExecution,
  ExecutionItemRecord,
  PracticeStatus,
  STATUS_OPTIONS,
  STATUS_COLORS,
  DIFFICULTY_COLORS,
  PaperPattern,
} from '../types';
import {
  X, Play, Pause, SkipForward, SkipBack, Clock, AlertTriangle,
  CheckCircle, HelpCircle, FileText, AlertCircle, Package,
  ChevronDown, ChevronRight, User, FolderOpen,
} from 'lucide-react';

interface PracticeExecutionProps {
  execution: PracticeExecution;
  onUpdate: (execution: PracticeExecution) => void;
  onComplete: (execution: PracticeExecution) => void;
  onClose: () => void;
}

export default function PracticeExecutionComponent({
  execution,
  onUpdate,
  onComplete,
  onClose,
}: PracticeExecutionProps) {
  const [currentIndex, setCurrentIndex] = useState(execution.currentIndex);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const currentItem = execution.items[currentIndex];
  const pattern = currentItem?.patternSnapshot;

  useEffect(() => {
    let interval: number | null = null;
    if (isRunning) {
      interval = window.setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };

  const getTotalElapsedMinutes = useCallback((): number => {
    let total = 0;
    execution.items.forEach((item, idx) => {
      if (idx < currentIndex) {
        total += item.actualDuration || item.patternSnapshot.estimatedDuration;
      }
    });
    total += Math.round(elapsedSeconds / 60);
    return total;
  }, [execution.items, currentIndex, elapsedSeconds]);

  const updateCurrentItem = (updates: Partial<ExecutionItemRecord>) => {
    const newItems = [...execution.items];
    newItems[currentIndex] = { ...newItems[currentIndex], ...updates };
    onUpdate({
      ...execution,
      items: newItems,
      currentIndex,
    });
  };

  const handleStart = () => {
    const now = Date.now();
    setIsRunning(true);
    updateCurrentItem({ startedAt: now });
    onUpdate({
      ...execution,
      status: 'running',
      startedAt: execution.startedAt || now,
    });
  };

  const handlePause = () => {
    setIsRunning(false);
    onUpdate({
      ...execution,
      status: 'paused',
      pausedAt: Date.now(),
    });
  };

  const handleResume = () => {
    if (execution.pausedAt) {
      const pausedDuration = Date.now() - execution.pausedAt;
      onUpdate({
        ...execution,
        status: 'running',
        pausedAt: undefined,
        totalPausedDuration: execution.totalPausedDuration + pausedDuration,
      });
    }
    setIsRunning(true);
  };

  const handleNext = () => {
    const manualDuration = currentItem.actualDuration || 0;
    const timedDuration = Math.max(1, Math.round(elapsedSeconds / 60));
    const actualDuration = manualDuration > 0 ? manualDuration : timedDuration;
    updateCurrentItem({
      actualDuration,
      endedAt: Date.now(),
    });
    setElapsedSeconds(0);
    if (currentIndex < execution.items.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      const newItems = [...execution.items];
      newItems[currentIndex] = { ...newItems[currentIndex], actualDuration, endedAt: Date.now() };
      newItems[nextIndex] = { ...newItems[nextIndex], startedAt: Date.now() };
      onUpdate({
        ...execution,
        items: newItems,
        currentIndex: nextIndex,
      });
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const manualDuration = currentItem.actualDuration || 0;
      const timedDuration = Math.max(1, Math.round(elapsedSeconds / 60));
      const actualDuration = manualDuration > 0 ? manualDuration : timedDuration;
      updateCurrentItem({ actualDuration });
      setElapsedSeconds(0);
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      const prevItem = execution.items[prevIndex];
      setElapsedSeconds((prevItem.actualDuration || prevItem.patternSnapshot.estimatedDuration) * 60);
    }
  };

  const handleFinish = () => {
    const newItems = execution.items.map((item, idx) => {
      if (idx === currentIndex) {
        const manualDuration = item.actualDuration || 0;
        const timedDuration = Math.max(1, Math.round(elapsedSeconds / 60));
        const actualDuration = manualDuration > 0 ? manualDuration : timedDuration;
        return { ...item, actualDuration, endedAt: Date.now() };
      }
      return item;
    });
    const finalExecution: PracticeExecution = {
      ...execution,
      items: newItems,
      status: 'completed',
      endedAt: Date.now(),
      currentIndex,
    };
    onComplete(finalExecution);
  };

  const getProgressPercentage = () => {
    const completed = execution.items.filter((item, idx) =>
      idx < currentIndex || (idx === currentIndex && item.completed)
    ).length;
    return Math.round((completed / execution.items.length) * 100);
  };

  if (!pattern) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-large" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>执行错误</h3>
            <button className="icon-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <div className="modal-body">
            <p>无法找到当前图样数据。</p>
          </div>
        </div>
      </div>
    );
  }

  const plannedTotal = execution.items.reduce((sum, item) => sum + item.patternSnapshot.estimatedDuration, 0);
  const actualSoFar = getTotalElapsedMinutes();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large execution-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>
              <Play size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} />
              练习执行 - {execution.planSnapshot.name || '未命名方案'}
            </h3>
            <div className="preview-meta">
              <span><FolderOpen size={12} /> 共 {execution.items.length} 项</span>
              <span>进度：{currentIndex + 1}/{execution.items.length} ({getProgressPercentage()}%)</span>
              <span><Clock size={14} /> 计划 {formatDuration(plannedTotal)}</span>
              <span><Clock size={14} /> 已用 {formatDuration(actualSoFar)}</span>
              {execution.planSnapshot.owner && (
                <span><User size={12} /> {execution.planSnapshot.owner}</span>
              )}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="execution-progress-bar">
          <div
            className="execution-progress-fill"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>

        <div className="modal-body">
          <div className="execution-header">
            <div className="execution-title-section">
              <div className="execution-index-badge">{currentIndex + 1}</div>
              <div>
                <h2 className="execution-pattern-name">{pattern.name || '未命名图样'}</h2>
                <div className="execution-tags">
                  {pattern.theme && <span className="tag tag-theme">{pattern.theme}</span>}
                  <span className="tag" style={{ backgroundColor: DIFFICULTY_COLORS[pattern.difficulty] + '22', color: DIFFICULTY_COLORS[pattern.difficulty] }}>
                    {pattern.difficulty}
                  </span>
                  <span className="tag tag-duration">
                    <Clock size={12} /> 计划 {pattern.estimatedDuration}分钟
                  </span>
                  {pattern.owner && (
                    <span className="tag"><User size={12} /> {pattern.owner}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="execution-timer">
              <div className="timer-display">{formatTime(elapsedSeconds)}</div>
              <div className="timer-controls">
                {!isRunning && !currentItem.startedAt && (
                  <button className="btn btn-primary" onClick={handleStart}>
                    <Play size={16} /> 开始
                  </button>
                )}
                {!isRunning && currentItem.startedAt && (
                  <button className="btn btn-primary" onClick={handleResume}>
                    <Play size={16} /> 继续
                  </button>
                )}
                {isRunning && (
                  <button className="btn btn-secondary" onClick={handlePause}>
                    <Pause size={16} /> 暂停
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="execution-item-header" onClick={() => setExpanded(!expanded)}>
            <span className="execution-expand-label">
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              图样详情
            </span>
          </div>

          {expanded && (
            <div className="execution-details">
              {pattern.foldingMethod && (
                <div className="detail-row">
                  <span className="detail-label">折纸方式：</span>
                  <span>{pattern.foldingMethod}</span>
                </div>
              )}
              {pattern.knifeTechniques && (
                <div className="detail-row">
                  <span className="detail-label">刀法要点：</span>
                  <span>{pattern.knifeTechniques}</span>
                </div>
              )}
              {pattern.riskWarnings && (
                <div className="detail-row detail-warning">
                  <span className="detail-label"><AlertTriangle size={14} /> 风险提醒：</span>
                  <span>{pattern.riskWarnings}</span>
                </div>
              )}
              {pattern.backupPlan && (
                <div className="detail-row">
                  <span className="detail-label"><FileText size={14} /> 备用方案：</span>
                  <span>{pattern.backupPlan}</span>
                </div>
              )}
              {pattern.steps.length > 0 && (
                <div className="detail-section">
                  <div className="detail-label">步骤：</div>
                  <ol className="detail-steps">
                    {pattern.steps.map((s, i) => (
                      <li key={s.id}>
                        <strong>{s.title || `步骤 ${i + 1}`}</strong>
                        {s.description && <p>{s.description}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {pattern.materials.length > 0 && (
                <div className="detail-section">
                  <div className="detail-label">
                    <Package size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 3 }} />
                    材料清单：
                  </div>
                  <div className="material-list">
                    {pattern.materials.map(m => (
                      <div key={m.id} className="material-item">
                        <span className="material-name">{m.name}</span>
                        {m.quantity && <span className="material-qty">× {m.quantity}</span>}
                        {m.note && <span className="material-note">（{m.note}）</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="execution-form">
            <div className="form-section">
              <div className="form-section-title">执行记录</div>

              <div className="form-row">
                <label className="form-label">实际状态</label>
                <div className="status-buttons">
                  {STATUS_OPTIONS.map(status => (
                    <button
                      key={status}
                      className={`status-btn ${currentItem.actualStatus === status ? 'active' : ''}`}
                      style={{
                        borderColor: STATUS_COLORS[status],
                        backgroundColor: currentItem.actualStatus === status ? STATUS_COLORS[status] + '22' : 'transparent',
                        color: STATUS_COLORS[status],
                      }}
                      onClick={() => {
                        const updates: Partial<ExecutionItemRecord> = { actualStatus: status };
                        if (status === '需协助') {
                          updates.needAssistance = true;
                        }
                        updateCurrentItem(updates);
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {pattern.materials.length > 0 && (
                <div className="form-row">
                  <label className="form-label">
                    <Package size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 3 }} />
                    材料准备确认
                  </label>
                  <div className="material-check-list">
                    {pattern.materials.map(m => {
                      const checked = currentItem.materialsPrepared?.[m.id] || false;
                      return (
                        <label key={m.id} className="checkbox-label material-check">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              const newMatPrepared = { ...(currentItem.materialsPrepared || {}), [m.id]: e.target.checked };
                              updateCurrentItem({ materialsPrepared: newMatPrepared });
                            }}
                          />
                          <span className="material-check-name">{m.name}</span>
                          {m.quantity && <span className="material-qty">× {m.quantity}</span>}
                          {m.note && <span className="material-note">（{m.note}）</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="form-row">
                <label className="form-label">实际耗时（分钟）</label>
                <input
                  type="number"
                  className="form-input"
                  value={currentItem.actualDuration || Math.round(elapsedSeconds / 60)}
                  onChange={e => updateCurrentItem({ actualDuration: parseInt(e.target.value) || 0 })}
                  min="1"
                />
              </div>

              <div className="form-row">
                <label className="form-label">现场问题记录</label>
                <textarea
                  className="form-textarea"
                  value={currentItem.issuesOnSite}
                  onChange={e => updateCurrentItem({ issuesOnSite: e.target.value })}
                  placeholder="记录练习过程中遇到的问题、难点、学生反应等..."
                  rows={3}
                />
              </div>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={currentItem.completed}
                    onChange={e => updateCurrentItem({ completed: e.target.checked })}
                  />
                  <CheckCircle size={16} />
                  <span>已完成</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={currentItem.needAssistance}
                    onChange={e => updateCurrentItem({ needAssistance: e.target.checked })}
                  />
                  <HelpCircle size={16} />
                  <span>需要后续协助</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={currentItem.usedBackupPlan}
                    onChange={e => updateCurrentItem({ usedBackupPlan: e.target.checked })}
                  />
                  <FileText size={16} />
                  <span>使用了备用方案</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={currentItem.riskReminded}
                    onChange={e => updateCurrentItem({ riskReminded: e.target.checked })}
                  />
                  <AlertCircle size={16} />
                  <span>已做风险提醒</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="footer-left">
            <button
              className="btn btn-secondary"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              <SkipBack size={16} /> 上一项
            </button>
          </div>
          <div className="footer-right">
            {currentIndex < execution.items.length - 1 ? (
              <button className="btn btn-primary" onClick={handleNext}>
                下一项 <SkipForward size={16} />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleFinish}>
                <CheckCircle size={16} /> 完成并生成复盘
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
