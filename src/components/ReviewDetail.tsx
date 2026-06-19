import { useState } from 'react';
import {
  ReviewRecord,
  ReviewSummary,
  PracticeExecution,
  STATUS_COLORS,
  DIFFICULTY_COLORS,
} from '../types';
import { generateReviewText, copyToClipboard } from '../reviewUtils';
import {
  X, Clock, AlertTriangle, CheckCircle, HelpCircle, FileText,
  Users, Package, Copy, Save, ChevronDown, ChevronRight,
  User, FolderOpen, Check, AlertCircle, Download,
} from 'lucide-react';

interface ReviewDetailProps {
  summary: ReviewSummary;
  execution: PracticeExecution;
  existingRecord?: ReviewRecord;
  onSave: (record: ReviewRecord) => void;
  onClose: () => void;
}

export default function ReviewDetail({
  summary,
  execution,
  existingRecord,
  onSave,
  onClose,
}: ReviewDetailProps) {
  const [copied, setCopied] = useState(false);
  const [overallNotes, setOverallNotes] = useState(summary.overallNotes || '');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    duration: true,
    items: true,
    incomplete: true,
    assistance: true,
    risks: true,
    backup: true,
    owners: true,
    materials: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = async () => {
    const updatedSummary = { ...summary, overallNotes };
    const text = generateReviewText(updatedSummary, execution);
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedSummary = { ...summary, overallNotes };
      const now = Date.now();
      const record: ReviewRecord = existingRecord ? {
        ...existingRecord,
        summary: updatedSummary,
        execution,
        updatedAt: now,
      } : {
        id: `review_${now}_${Math.random().toString(36).slice(2, 9)}`,
        planId: execution.planId,
        planName: execution.planSnapshot.name || '未命名方案',
        executionId: execution.id,
        summary: updatedSummary,
        execution,
        createdAt: now,
        updatedAt: now,
      };
      await onSave(record);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };

  const getDurationColor = (diff: number): string => {
    if (diff > 30) return '#ef4444';
    if (diff > 10) return '#f59e0b';
    if (diff < -10) return '#10b981';
    return '#6b7280';
  };

  const SectionHeader = ({ id, icon, title, count, warning }: {
    id: string;
    icon: React.ReactNode;
    title: string;
    count?: number;
    warning?: boolean;
  }) => (
    <div
      className={`review-section-header ${warning ? 'warning' : ''}`}
      onClick={() => toggleSection(id)}
    >
      <div className="review-section-title">
        {expandedSections[id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {icon}
        <span>{title}</span>
        {typeof count === 'number' && (
          <span className={`review-count ${count > 0 ? 'has-count' : ''}`}>{count}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large review-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>
              <FileText size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} />
              练习复盘报告 - {execution.planSnapshot.name || '未命名方案'}
            </h3>
            <div className="preview-meta">
              <span><FolderOpen size={12} /> {execution.items.length} 项内容</span>
              <span>
                生成时间：{new Date(execution.endedAt || Date.now()).toLocaleString('zh-CN')}
              </span>
              {execution.planSnapshot.owner && (
                <span><User size={12} /> {execution.planSnapshot.owner}</span>
              )}
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-small" onClick={handleCopy} disabled={copied}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '已复制' : '一键复制'}
            </button>
            <button
              className="btn btn-small btn-primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save size={14} /> {isSaving ? '保存中...' : (existingRecord ? '更新记录' : '保存记录')}
            </button>
            <button className="icon-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body review-body">
          <SectionHeader
            id="duration"
            icon={<Clock size={16} />}
            title="时长对比"
          />
          {expandedSections.duration && (
            <div className="review-section-content">
              <div className="duration-comparison">
                <div className="duration-card">
                  <div className="duration-label">计划总时长</div>
                  <div className="duration-value">{formatDuration(summary.planDuration)}</div>
                </div>
                <div className="duration-card">
                  <div className="duration-label">实际总时长</div>
                  <div className="duration-value">{formatDuration(summary.actualDuration)}</div>
                </div>
                <div className="duration-card">
                  <div className="duration-label">差异</div>
                  <div className="duration-value" style={{ color: getDurationColor(summary.durationDifference) }}>
                    {summary.durationDifference >= 0 ? '+' : ''}{summary.durationDifference} 分钟
                  </div>
                </div>
              </div>
            </div>
          )}

          <SectionHeader
            id="items"
            icon={<CheckCircle size={16} />}
            title="逐项执行记录"
          />
          {expandedSections.items && (
            <div className="review-section-content">
              <div className="execution-items-list">
                {execution.items.map((item, idx) => {
                  const p = item.patternSnapshot;
                  return (
                    <div key={item.patternId} className="execution-item-record">
                      <div className="execution-item-header">
                        <span className="execution-item-index">{idx + 1}</span>
                        <span className="execution-item-name">{p.name || '未命名图样'}</span>
                        <span
                          className="tag"
                          style={{
                            backgroundColor: STATUS_COLORS[item.actualStatus] + '22',
                            color: STATUS_COLORS[item.actualStatus],
                          }}
                        >
                          {item.actualStatus}
                        </span>
                        <span
                          className="tag"
                          style={{
                            backgroundColor: DIFFICULTY_COLORS[p.difficulty] + '22',
                            color: DIFFICULTY_COLORS[p.difficulty],
                          }}
                        >
                          {p.difficulty}
                        </span>
                      </div>
                      <div className="execution-item-details">
                        <div className="detail-row-inline">
                          <span>计划：{p.estimatedDuration}分钟</span>
                          <span>实际：{item.actualDuration}分钟</span>
                          <span className={item.completed ? 'status-ok' : 'status-warn'}>
                            {item.completed ? '✓ 已完成' : '✗ 未完成'}
                          </span>
                        </div>
                        <div className="detail-row-inline">
                          {item.needAssistance && (
                            <span className="badge badge-warn"><HelpCircle size={12} /> 需协助</span>
                          )}
                          {item.usedBackupPlan && (
                            <span className="badge badge-info"><FileText size={12} /> 用了备用方案</span>
                          )}
                          {!item.riskReminded && p.riskWarnings && (
                            <span className="badge badge-danger"><AlertTriangle size={12} /> 风险遗漏</span>
                          )}
                          {p.owner && (
                            <span className="badge"><User size={12} /> {p.owner}</span>
                          )}
                        </div>
                        {item.issuesOnSite && (
                          <div className="execution-item-issues">
                            <AlertCircle size={14} />
                            <span>现场问题：{item.issuesOnSite}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <SectionHeader
            id="incomplete"
            icon={<CheckCircle size={16} />}
            title="未完成图样"
            count={summary.incompletePatterns.length}
            warning={summary.incompletePatterns.length > 0}
          />
          {expandedSections.incomplete && (
            <div className="review-section-content">
              {summary.incompletePatterns.length === 0 ? (
                <div className="empty-review">
                  <CheckCircle size={24} className="icon-success" />
                  <p>全部图样已完成！</p>
                </div>
              ) : (
                <div className="pattern-list-simple">
                  {summary.incompletePatterns.map((p, idx) => (
                    <div key={p.id} className="pattern-item-simple">
                      <span className="item-index">{idx + 1}.</span>
                      <span className="item-name">{p.name}</span>
                      {p.owner && <span className="item-meta">（{p.owner}）</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <SectionHeader
            id="assistance"
            icon={<HelpCircle size={16} />}
            title="需协助图样"
            count={summary.assistancePatterns.length}
            warning={summary.assistancePatterns.length > 0}
          />
          {expandedSections.assistance && (
            <div className="review-section-content">
              {summary.assistancePatterns.length === 0 ? (
                <div className="empty-review">
                  <CheckCircle size={24} className="icon-success" />
                  <p>无需要协助的图样。</p>
                </div>
              ) : (
                <div className="pattern-list-simple">
                  {summary.assistancePatterns.map((p, idx) => (
                    <div key={p.id} className="pattern-item-simple">
                      <span className="item-index">{idx + 1}.</span>
                      <span className="item-name">{p.name}</span>
                      {p.owner && <span className="item-meta">（{p.owner}）</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <SectionHeader
            id="risks"
            icon={<AlertTriangle size={16} />}
            title="风险提醒遗漏"
            count={summary.missedRisks.length}
            warning={summary.missedRisks.length > 0}
          />
          {expandedSections.risks && (
            <div className="review-section-content">
              {summary.missedRisks.length === 0 ? (
                <div className="empty-review">
                  <CheckCircle size={24} className="icon-success" />
                  <p>所有风险提醒均已落实！</p>
                </div>
              ) : (
                <div className="risk-list">
                  {summary.missedRisks.map((item, idx) => (
                    <div key={idx} className="risk-item">
                      <AlertTriangle size={16} className="icon-warn" />
                      <div>
                        <div className="risk-pattern">{item.pattern.name}</div>
                        <div className="risk-warning">{item.warning}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <SectionHeader
            id="backup"
            icon={<FileText size={16} />}
            title="备用方案使用情况"
            count={summary.usedBackupPatterns.length}
          />
          {expandedSections.backup && (
            <div className="review-section-content">
              {summary.usedBackupPatterns.length === 0 ? (
                <div className="empty-review">
                  <p>未使用任何备用方案。</p>
                </div>
              ) : (
                <div className="backup-list">
                  {summary.usedBackupPatterns.map((p, idx) => {
                    const backupPlan = execution.items.find(i => i.patternId === p.id)?.patternSnapshot.backupPlan;
                    return (
                      <div key={p.id} className="backup-item">
                        <FileText size={16} className="icon-info" />
                        <div>
                          <div className="backup-pattern">{p.name}</div>
                          {backupPlan && <div className="backup-detail">备用方案：{backupPlan}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <SectionHeader
            id="owners"
            icon={<Users size={16} />}
            title="负责人维度统计"
          />
          {expandedSections.owners && (
            <div className="review-section-content">
              {Object.keys(summary.ownerStats).length === 0 ? (
                <div className="empty-review">
                  <p>暂无负责人数据。</p>
                </div>
              ) : (
                <div className="owner-stats">
                  {Object.entries(summary.ownerStats).map(([owner, stats]) => {
                    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                    return (
                      <div key={owner} className="owner-stat-card">
                        <div className="owner-name">
                          <User size={16} /> {owner}
                        </div>
                        <div className="owner-stat-row">
                          <span>负责图样</span>
                          <span className="stat-value">{stats.total} 项</span>
                        </div>
                        <div className="owner-stat-row">
                          <span>已完成</span>
                          <span className="stat-value stat-ok">{stats.completed} 项（{completionRate}%）</span>
                        </div>
                        <div className="owner-stat-row">
                          <span>需协助</span>
                          <span className={`stat-value ${stats.needAssistance > 0 ? 'stat-warn' : ''}`}>
                            {stats.needAssistance} 项
                          </span>
                        </div>
                        <div className="progress-bar-small">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <SectionHeader
            id="materials"
            icon={<Package size={16} />}
            title="材料准备清单回顾"
          />
          {expandedSections.materials && (
            <div className="review-section-content">
              <div className="materials-review">
                <div className="materials-column">
                  <h4 className="materials-title">
                    <CheckCircle size={14} className="icon-success" /> 已准备
                    <span className="review-count has-count">{summary.materialsReview.prepared.length}</span>
                  </h4>
                  {summary.materialsReview.prepared.length === 0 ? (
                    <p className="empty-hint">无已准备材料记录</p>
                  ) : (
                    <div className="material-list-review">
                      {summary.materialsReview.prepared.map((m, idx) => (
                        <div key={idx} className="material-item-review prepared">
                          <Check size={14} className="icon-success" />
                          <span className="mat-name">{m.name}</span>
                          {m.quantity && <span className="mat-qty">× {m.quantity}</span>}
                          <span className="mat-pattern">- {m.pattern}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="materials-column">
                  <h4 className="materials-title">
                    <AlertCircle size={14} className="icon-warn" /> 遗漏
                    <span className={`review-count ${summary.materialsReview.missing.length > 0 ? 'has-count warn' : ''}`}>
                      {summary.materialsReview.missing.length}
                    </span>
                  </h4>
                  {summary.materialsReview.missing.length === 0 ? (
                    <p className="empty-hint success">材料准备齐全，无遗漏！</p>
                  ) : (
                    <div className="material-list-review">
                      {summary.materialsReview.missing.map((m, idx) => (
                        <div key={idx} className="material-item-review missing">
                          <X size={14} className="icon-warn" />
                          <span className="mat-name">{m.name}</span>
                          {m.quantity && <span className="mat-qty">× {m.quantity}</span>}
                          <span className="mat-pattern">- {m.pattern}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="review-section">
            <div className="review-section-header">
              <div className="review-section-title">
                <FileText size={16} />
                <span>总体备注</span>
              </div>
            </div>
            <div className="review-section-content">
              <textarea
                className="form-textarea"
                value={overallNotes}
                onChange={e => setOverallNotes(e.target.value)}
                placeholder="记录本次练习的总体评价、改进建议、下次注意事项等..."
                rows={4}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
