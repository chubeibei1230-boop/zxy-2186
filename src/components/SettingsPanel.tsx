import { AppSettings } from '../types';
import { X } from 'lucide-react';

interface SettingsPanelProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onClose: () => void;
}

export default function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>系统设置</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-field">
              <label>活动总时长上限（分钟）</label>
              <input
                type="number"
                min={30}
                value={settings.totalDurationLimit}
                onChange={e => onChange({ ...settings, totalDurationLimit: Math.max(30, parseInt(e.target.value) || 30) })}
              />
              <div className="field-hint">超过此时长将触发错误提示</div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>单人负责条目上限</label>
              <input
                type="number"
                min={1}
                value={settings.maxItemsPerOwner}
                onChange={e => onChange({ ...settings, maxItemsPerOwner: Math.max(1, parseInt(e.target.value) || 1) })}
              />
              <div className="field-hint">超过此数量将触发负责人过载警告</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
