import { CheckIssue } from '../types';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';

interface IssuesPanelProps {
  issues: CheckIssue[];
  onHighlight: (ids: string[]) => void;
  onClose?: () => void;
}

const ISSUE_LABELS: Record<CheckIssue['type'], string> = {
  theme_consecutive: '主题连续',
  duration_exceed: '时长超限',
  risk_missing: '风险缺失',
  owner_too_many: '负责人过载',
  backup_missing: '方案缺失',
};

export default function IssuesPanel({ issues, onHighlight, onClose }: IssuesPanelProps) {
  if (issues.length === 0) return null;

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warnCount = issues.filter(i => i.severity === 'warning').length;

  return (
    <div className="issues-panel">
      <div className="issues-header">
        <div className="issues-title">
          {errorCount > 0 && <span className="badge badge-error">{errorCount} 个错误</span>}
          {warnCount > 0 && <span className="badge badge-warn">{warnCount} 个警告</span>}
        </div>
        {onClose && (
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </div>
      <div className="issues-list">
        {issues.map((issue, idx) => (
          <div
            key={idx}
            className={`issue-item severity-${issue.severity}`}
            onClick={() => onHighlight(issue.patternIds)}
          >
            <div className="issue-icon">
              {issue.severity === 'error' ? (
                <AlertCircle size={18} />
              ) : (
                <AlertTriangle size={18} />
              )}
            </div>
            <div className="issue-body">
              <div className="issue-type">{ISSUE_LABELS[issue.type]}</div>
              <div className="issue-message">{issue.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
