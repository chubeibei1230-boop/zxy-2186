import { PracticePlan } from '../types';
import { Plus, Trash2, FolderOpen, X } from 'lucide-react';

interface PlanListProps {
  plans: PracticePlan[];
  selectedPlanId: string | null;
  allViewActive: boolean;
  onSelectPlan: (id: string | null) => void;
  onAddPlan: () => void;
  onDeletePlan: (id: string) => void;
  onClose?: () => void;
}

export default function PlanList({
  plans,
  selectedPlanId,
  allViewActive,
  onSelectPlan,
  onAddPlan,
  onDeletePlan,
  onClose,
}: PlanListProps) {
  return (
    <div className="plan-panel">
      <div className="plan-panel-header">
        <h3 className="plan-panel-title">
          <FolderOpen size={18} />
          练习方案
        </h3>
        {onClose && (
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </div>

      <div className="plan-list">
        <div
          className={`plan-item ${allViewActive ? 'active' : ''}`}
          onClick={() => onSelectPlan(null)}
        >
          <div className="plan-item-main">
            <div className="plan-item-name">
              <strong>全部图样</strong>
            </div>
            <div className="plan-item-meta">查看所有图样库中的内容</div>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 16px' }}>
            <p>暂无方案</p>
            <p className="empty-hint">点击下方按钮创建第一个方案</p>
          </div>
        ) : (
          plans.map(plan => (
            <div
              key={plan.id}
              className={`plan-item ${selectedPlanId === plan.id ? 'active' : ''}`}
              onClick={() => onSelectPlan(plan.id)}
            >
              <div className="plan-item-main">
                <div className="plan-item-name">
                  {plan.name || <em className="untitled">未命名方案</em>}
                </div>
                <div className="plan-item-meta">
                  {plan.items.length} 项内容
                  {plan.owner && ` · ${plan.owner}`}
                </div>
              </div>
              <button
                className="icon-btn danger plan-item-delete"
                title="删除方案"
                onClick={e => {
                  e.stopPropagation();
                  onDeletePlan(plan.id);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="plan-panel-footer">
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={onAddPlan}>
          <Plus size={16} /> 新建方案
        </button>
      </div>
    </div>
  );
}
