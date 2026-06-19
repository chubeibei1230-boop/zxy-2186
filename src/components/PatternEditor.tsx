import { PaperPattern, DIFFICULTY_OPTIONS, STATUS_OPTIONS, Difficulty, PracticeStatus, PatternStep } from '../types';
import { Plus, Trash2, X } from 'lucide-react';

interface PatternEditorProps {
  pattern: PaperPattern;
  onChange: (pattern: PaperPattern) => void;
  onClose?: () => void;
}

export default function PatternEditor({ pattern, onChange, onClose }: PatternEditorProps) {
  const update = (patch: Partial<PaperPattern>) => {
    onChange({ ...pattern, ...patch });
  };

  const addStep = () => {
    const newStep: PatternStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: '',
      description: '',
    };
    update({ steps: [...pattern.steps, newStep] });
  };

  const updateStep = (stepId: string, patch: Partial<PatternStep>) => {
    update({
      steps: pattern.steps.map(s => (s.id === stepId ? { ...s, ...patch } : s)),
    });
  };

  const removeStep = (stepId: string) => {
    update({ steps: pattern.steps.filter(s => s.id !== stepId) });
  };

  return (
    <div className="pattern-editor">
      <div className="editor-header">
        <h3>图样详情</h3>
        {onClose && (
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        )}
      </div>

      <div className="editor-body">
        <div className="form-row">
          <div className="form-field">
            <label>图样名称 *</label>
            <input
              type="text"
              value={pattern.name}
              placeholder="如：喜鹊闹春"
              onChange={e => update({ name: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row grid-3">
          <div className="form-field">
            <label>主题</label>
            <input
              type="text"
              value={pattern.theme}
              placeholder="如：花鸟、福字、生肖"
              onChange={e => update({ theme: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>难度</label>
            <select
              value={pattern.difficulty}
              onChange={e => update({ difficulty: e.target.value as Difficulty })}
            >
              {DIFFICULTY_OPTIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>当前状态</label>
            <select
              value={pattern.status}
              onChange={e => update({ status: e.target.value as PracticeStatus })}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row grid-3">
          <div className="form-field">
            <label>预计练习时长（分钟）</label>
            <input
              type="number"
              min={1}
              value={pattern.estimatedDuration}
              onChange={e => update({ estimatedDuration: Math.max(1, parseInt(e.target.value) || 1) })}
            />
          </div>
          <div className="form-field">
            <label>适合人数</label>
            <input
              type="text"
              value={pattern.suitablePeople}
              placeholder="如：1-2人、小组"
              onChange={e => update({ suitablePeople: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>负责人</label>
            <input
              type="text"
              value={pattern.owner}
              placeholder="指导老师/负责人"
              onChange={e => update({ owner: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>折纸方式</label>
            <textarea
              value={pattern.foldingMethod}
              rows={2}
              placeholder="如：对折两次，四折法，对角折..."
              onChange={e => update({ foldingMethod: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>刀法要点</label>
            <textarea
              value={pattern.knifeTechniques}
              rows={3}
              placeholder="如：阴刻为主，线条流畅，转角处需缓..."
              onChange={e => update({ knifeTechniques: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className={`${!pattern.riskWarnings.trim() ? 'label-warning' : ''}`}>
              风险提醒 {!pattern.riskWarnings.trim() && '⚠ 建议填写'}
            </label>
            <textarea
              value={pattern.riskWarnings}
              rows={2}
              placeholder="刀具使用安全、纸张边缘锋利、避免儿童接触..."
              onChange={e => update({ riskWarnings: e.target.value })}
              className={!pattern.riskWarnings.trim() ? 'input-warning' : ''}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className={`${!pattern.backupPlan.trim() ? 'label-warning' : ''}`}>
              备用方案 {!pattern.backupPlan.trim() && '⚠ 建议填写'}
            </label>
            <textarea
              value={pattern.backupPlan}
              rows={2}
              placeholder="如：改用简单图样、延长时间、分组协作..."
              onChange={e => update({ backupPlan: e.target.value })}
              className={!pattern.backupPlan.trim() ? 'input-warning' : ''}
            />
          </div>
        </div>

        <div className="section-block">
          <div className="section-header">
            <h4>步骤摘要</h4>
            <button className="btn btn-small" onClick={addStep}>
              <Plus size={14} /> 添加步骤
            </button>
          </div>
          <div className="steps-list">
            {pattern.steps.length === 0 ? (
              <p className="empty-hint">暂无步骤，点击「添加步骤」创建</p>
            ) : (
              pattern.steps.map((step, idx) => (
                <div key={step.id} className="step-item">
                  <div className="step-index">{idx + 1}</div>
                  <div className="step-content">
                    <input
                      type="text"
                      className="step-title"
                      placeholder="步骤标题"
                      value={step.title}
                      onChange={e => updateStep(step.id, { title: e.target.value })}
                    />
                    <textarea
                      className="step-desc"
                      placeholder="详细说明"
                      rows={2}
                      value={step.description}
                      onChange={e => updateStep(step.id, { description: e.target.value })}
                    />
                  </div>
                  <button className="icon-btn danger" onClick={() => removeStep(step.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="section-block">
          <div className="section-header">
            <h4>注意事项</h4>
          </div>
          <textarea
            rows={3}
            placeholder="其他需要注意的细节..."
            value={pattern.notes}
            onChange={e => update({ notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
