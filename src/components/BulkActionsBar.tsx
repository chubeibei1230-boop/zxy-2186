import { PracticeStatus, STATUS_OPTIONS } from '../types';
import { CheckSquare, X } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onBatchStatus: (status: PracticeStatus) => void;
  onBatchDelete: () => void;
  onClearSelection: () => void;
}

export default function BulkActionsBar({ selectedCount, onBatchStatus, onBatchDelete, onClearSelection }: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bulk-actions-bar">
      <div className="bulk-info">
        <CheckSquare size={18} />
        <span>已选择 <strong>{selectedCount}</strong> 项</span>
      </div>
      <div className="bulk-actions">
        <span className="bulk-label">批量修改状态为：</span>
        {STATUS_OPTIONS.map(status => (
          <button key={status} className="btn btn-small" onClick={() => onBatchStatus(status)}>
            {status}
          </button>
        ))}
        <div className="bulk-divider" />
        <button className="btn btn-small btn-danger" onClick={onBatchDelete}>
          批量删除
        </button>
        <button className="btn btn-small btn-ghost" onClick={onClearSelection}>
          <X size={14} /> 取消选择
        </button>
      </div>
    </div>
  );
}
