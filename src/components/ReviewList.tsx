import { useState } from 'react';
import { ReviewRecord } from '../types';
import { generateReviewText, copyToClipboard } from '../reviewUtils';
import {
  X, FileText, Clock, CheckCircle, HelpCircle, AlertTriangle,
  Trash2, Eye, Copy, Check, ChevronRight, User, FolderOpen,
} from 'lucide-react';

interface ReviewListProps {
  reviews: ReviewRecord[];
  onView: (review: ReviewRecord) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function ReviewList({
  reviews,
  onView,
  onDelete,
  onClose,
}: ReviewListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  };

  const handleCopy = async (review: ReviewRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = generateReviewText(review.summary, review.execution);
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(review.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定删除此复盘记录吗？删除后无法恢复。')) {
      onDelete(id);
    }
  };

  const getCompletionRate = (review: ReviewRecord): number => {
    const total = review.execution.items.length;
    const completed = review.execution.items.filter(i => i.completed).length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large review-list-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <FileText size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} />
            复盘记录
          </h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {reviews.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <FileText size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <p>暂无复盘记录</p>
              <p className="empty-hint">完成练习执行后可生成复盘记录</p>
            </div>
          ) : (
            <div className="review-list">
              {reviews.map(review => {
                const completionRate = getCompletionRate(review);
                const needAssistanceCount = review.summary.assistancePatterns.length;
                const incompleteCount = review.summary.incompletePatterns.length;
                const riskMissedCount = review.summary.missedRisks.length;

                return (
                  <div
                    key={review.id}
                    className="review-card"
                    onClick={() => onView(review)}
                  >
                    <div className="review-card-main">
                      <div className="review-card-header">
                        <h4 className="review-card-title">
                          <FolderOpen size={16} />
                          {review.planName || '未命名方案'}
                        </h4>
                        <div className="review-card-meta">
                          <span className="meta-item">
                            <Clock size={12} />
                            {new Date(review.createdAt).toLocaleString('zh-CN')}
                          </span>
                          {review.execution.planSnapshot.owner && (
                            <span className="meta-item">
                              <User size={12} />
                              {review.execution.planSnapshot.owner}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="review-card-stats">
                        <div className="stat-item">
                          <div className="stat-label">完成率</div>
                          <div className={`stat-value ${completionRate === 100 ? 'stat-ok' : completionRate >= 60 ? 'stat-warn' : 'stat-danger'}`}>
                            {completionRate}%
                          </div>
                        </div>
                        <div className="stat-item">
                          <div className="stat-label">计划/实际</div>
                          <div className="stat-value">
                            {formatDuration(review.summary.planDuration)} / {formatDuration(review.summary.actualDuration)}
                          </div>
                        </div>
                        <div className="stat-item">
                          <div className="stat-label">项数</div>
                          <div className="stat-value">
                            {review.execution.items.length}
                          </div>
                        </div>
                      </div>

                      <div className="review-card-tags">
                        {incompleteCount > 0 && (
                          <span className="review-tag tag-warn">
                            <CheckCircle size={12} />
                            未完成 {incompleteCount}
                          </span>
                        )}
                        {needAssistanceCount > 0 && (
                          <span className="review-tag tag-warn">
                            <HelpCircle size={12} />
                            需协助 {needAssistanceCount}
                          </span>
                        )}
                        {riskMissedCount > 0 && (
                          <span className="review-tag tag-danger">
                            <AlertTriangle size={12} />
                            风险遗漏 {riskMissedCount}
                          </span>
                        )}
                        {review.summary.usedBackupPatterns.length > 0 && (
                          <span className="review-tag tag-info">
                            <FileText size={12} />
                            备用方案 {review.summary.usedBackupPatterns.length}
                          </span>
                        )}
                      </div>

                      <div className="review-card-progress">
                        <div className="progress-bar-small">
                          <div
                            className={`progress-bar-fill ${completionRate === 100 ? 'bg-success' : completionRate >= 60 ? 'bg-warning' : 'bg-danger'}`}
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="review-card-actions">
                      <button
                        className="icon-btn"
                        title="查看详情"
                        onClick={(e) => { e.stopPropagation(); onView(review); }}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="icon-btn"
                        title={copiedId === review.id ? '已复制' : '一键复制'}
                        onClick={(e) => handleCopy(review, e)}
                      >
                        {copiedId === review.id ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                      <button
                        className="icon-btn danger"
                        title="删除"
                        onClick={(e) => handleDelete(review.id, e)}
                      >
                        <Trash2 size={16} />
                      </button>
                      <ChevronRight size={16} className="review-card-arrow" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
