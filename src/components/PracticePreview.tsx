import { useState, useEffect } from 'react';
import { PaperPattern, STATUS_COLORS, DIFFICULTY_COLORS } from '../types';
import { X, Clock, Users, ChevronDown, ChevronRight, CheckCircle2, Circle, Download, Package } from 'lucide-react';

interface PracticePreviewProps {
  patterns: PaperPattern[];
  onClose: () => void;
}

export default function PracticePreview({ patterns, onClose }: PracticePreviewProps) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [matChecks, setMatChecks] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const totalDuration = patterns.reduce((s, p) => s + (p.estimatedDuration || 0), 0);
  const completedCount = Object.values(checks).filter(Boolean).length;
  const totalMaterials = patterns.reduce((s, p) => s + p.materials.length, 0);
  const checkedMaterials = Object.values(matChecks).filter(Boolean).length;

  useEffect(() => {
    try {
      const s1 = localStorage.getItem('practice-checks');
      if (s1) setChecks(JSON.parse(s1));
      const s2 = localStorage.getItem('practice-mat-checks');
      if (s2) setMatChecks(JSON.parse(s2));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('practice-checks', JSON.stringify(checks));
  }, [checks]);

  useEffect(() => {
    localStorage.setItem('practice-mat-checks', JSON.stringify(matChecks));
  }, [matChecks]);

  const toggleCheck = (id: string) => {
    setChecks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleMatCheck = (matId: string) => {
    setMatChecks(prev => ({ ...prev, [matId]: !prev[matId] }));
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const resetChecks = () => {
    setChecks({});
    setMatChecks({});
  };

  const exportList = () => {
    const lines = ['# 剪纸练习执行清单', '', `生成时间：${new Date().toLocaleString('zh-CN')}`, `共 ${patterns.length} 项，总时长 ${totalDuration} 分钟`, ''];
    patterns.forEach((p, idx) => {
      lines.push(`## ${idx + 1}. ${p.name || '未命名图样'}`);
      lines.push(`- 主题：${p.theme || '-'} | 难度：${p.difficulty} | 时长：${p.estimatedDuration}分钟`);
      if (p.suitablePeople) lines.push(`- 适合人数：${p.suitablePeople}`);
      if (p.owner) lines.push(`- 负责人：${p.owner}`);
      if (p.foldingMethod) lines.push(`- 折纸方式：${p.foldingMethod}`);
      if (p.knifeTechniques) lines.push(`- 刀法要点：${p.knifeTechniques}`);
      if (p.materials.length > 0) {
        lines.push('- 材料清单：');
        p.materials.forEach(m => {
          const qtyPart = m.quantity ? ` × ${m.quantity}` : '';
          const notePart = m.note ? `（${m.note}）` : '';
          lines.push(`  - [ ] ${m.name}${qtyPart}${notePart}`);
        });
      }
      if (p.steps.length > 0) {
        lines.push('- 步骤：');
        p.steps.forEach((s, i) => {
          lines.push(`  ${i + 1}. ${s.title}${s.description ? ' - ' + s.description : ''}`);
        });
      }
      if (p.riskWarnings) lines.push(`- ⚠ 风险提醒：${p.riskWarnings}`);
      if (p.backupPlan) lines.push(`- 备用方案：${p.backupPlan}`);
      if (p.notes) lines.push(`- 备注：${p.notes}`);
      lines.push(`- 状态：${p.status}`);
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `练习清单_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>练习顺序预览</h3>
            <div className="preview-meta">
              <span>共 {patterns.length} 项</span>
              <span><Clock size={14} /> {totalDuration} 分钟</span>
              <span>图样进度 {completedCount}/{patterns.length} ({Math.round(completedCount / Math.max(patterns.length, 1) * 100)}%)</span>
              <span><Package size={14} /> 材料 {checkedMaterials}/{totalMaterials}</span>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-small" onClick={exportList}>
              <Download size={14} /> 导出清单
            </button>
            <button className="btn btn-small btn-ghost" onClick={resetChecks}>重置进度</button>
            <button className="icon-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          <div className="preview-progress-bar">
            <div
              className="preview-progress-fill"
              style={{ width: `${(completedCount / Math.max(patterns.length, 1)) * 100}%` }}
            />
          </div>

          {patterns.length === 0 ? (
            <div className="empty-state">
              <p>暂无内容可预览</p>
            </div>
          ) : (
            <div className="preview-list">
              {patterns.map((p, idx) => (
                <div key={p.id} className={`preview-item ${checks[p.id] ? 'checked' : ''}`}>
                  <div className="preview-item-header" onClick={() => toggleExpand(p.id)}>
                    <div className="preview-check" onClick={e => { e.stopPropagation(); toggleCheck(p.id); }}>
                      {checks[p.id] ? (
                        <CheckCircle2 size={22} className="check-icon checked" />
                      ) : (
                        <Circle size={22} className="check-icon" />
                      )}
                    </div>
                    <div className="preview-index">{idx + 1}</div>
                    <div className="preview-main">
                      <div className="preview-name">{p.name || <em className="untitled">未命名图样</em>}</div>
                      <div className="preview-tags">
                        {p.theme && <span className="tag tag-theme">{p.theme}</span>}
                        <span className="tag" style={{ backgroundColor: DIFFICULTY_COLORS[p.difficulty] + '22', color: DIFFICULTY_COLORS[p.difficulty] }}>
                          {p.difficulty}
                        </span>
                        <span className="tag tag-duration"><Clock size={12} /> {p.estimatedDuration}分</span>
                        {p.suitablePeople && <span className="tag tag-people"><Users size={12} /> {p.suitablePeople}</span>}
                        <span className="tag" style={{ backgroundColor: STATUS_COLORS[p.status] + '22', color: STATUS_COLORS[p.status] }}>
                          {p.status}
                        </span>
                        {p.materials.length > 0 && (
                          <span className="tag tag-materials">
                            <Package size={12} /> {checkedCount(p, matChecks)}/{p.materials.length} 材料
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="preview-expand">
                      {expanded[p.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>

                  {expanded[p.id] && (
                    <div className="preview-detail">
                      {p.foldingMethod && (
                        <div className="detail-row">
                          <span className="detail-label">折纸方式：</span>
                          <span>{p.foldingMethod}</span>
                        </div>
                      )}
                      {p.knifeTechniques && (
                        <div className="detail-row">
                          <span className="detail-label">刀法要点：</span>
                          <span>{p.knifeTechniques}</span>
                        </div>
                      )}
                      {p.owner && (
                        <div className="detail-row">
                          <span className="detail-label">负责人：</span>
                          <span>{p.owner}</span>
                        </div>
                      )}

                      {p.materials.length > 0 && (
                        <div className="detail-section">
                          <div className="detail-label">
                            <Package size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 3 }} />
                            材料核对清单：
                          </div>
                          <div className="material-check-list">
                            {p.materials.map(m => (
                              <div
                                key={m.id}
                                className={`material-check-row ${matChecks[m.id] ? 'mat-checked' : ''}`}
                                onClick={e => { e.stopPropagation(); toggleMatCheck(m.id); }}
                              >
                                <div className="mat-check-box">
                                  {matChecks[m.id] ? (
                                    <CheckCircle2 size={16} className="check-icon checked" />
                                  ) : (
                                    <Circle size={16} className="check-icon" />
                                  )}
                                </div>
                                <span className="mat-check-name">{m.name || '未命名材料'}</span>
                                {m.quantity && <span className="mat-check-qty">× {m.quantity}</span>}
                                {m.note && <span className="mat-check-note">（{m.note}）</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {p.steps.length > 0 && (
                        <div className="detail-section">
                          <div className="detail-label">步骤摘要：</div>
                          <ol className="detail-steps">
                            {p.steps.map((s, i) => (
                              <li key={s.id}>
                                <strong>{s.title || `步骤 ${i + 1}`}</strong>
                                {s.description && <p>{s.description}</p>}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {p.riskWarnings && (
                        <div className="detail-row detail-warning">
                          <span className="detail-label">⚠ 风险提醒：</span>
                          <span>{p.riskWarnings}</span>
                        </div>
                      )}
                      {p.backupPlan && (
                        <div className="detail-row">
                          <span className="detail-label">备用方案：</span>
                          <span>{p.backupPlan}</span>
                        </div>
                      )}
                      {p.notes && (
                        <div className="detail-row">
                          <span className="detail-label">备注：</span>
                          <span>{p.notes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function checkedCount(p: PaperPattern, matChecks: Record<string, boolean>): number {
  return p.materials.filter(m => matChecks[m.id]).length;
}
