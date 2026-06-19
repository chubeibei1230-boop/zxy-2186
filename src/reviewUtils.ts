import { PracticeExecution, ReviewSummary, ReviewRecord, PaperPattern } from './types';

export function generateReviewSummary(execution: PracticeExecution): ReviewSummary {
  const planDuration = execution.items.reduce((sum, item) => sum + item.patternSnapshot.estimatedDuration, 0);
  const actualDuration = execution.items.reduce((sum, item) => sum + item.actualDuration, 0);

  const incompletePatterns: PaperPattern[] = [];
  const assistancePatterns: PaperPattern[] = [];
  const missedRisks: { pattern: PaperPattern; warning: string }[] = [];
  const usedBackupPatterns: PaperPattern[] = [];
  const ownerStats: Record<string, { total: number; completed: number; needAssistance: number }> = {};
  const preparedMaterials: { name: string; quantity: string; note?: string; pattern: string }[] = [];
  const missingMaterials: { name: string; quantity: string; note?: string; pattern: string }[] = [];

  execution.items.forEach(item => {
    const pattern = item.patternSnapshot;

    if (!item.completed) {
      incompletePatterns.push(pattern);
    }

    if (item.needAssistance || item.actualStatus === '需协助') {
      assistancePatterns.push(pattern);
    }

    if (pattern.riskWarnings && !item.riskReminded) {
      missedRisks.push({ pattern, warning: pattern.riskWarnings });
    }

    if (item.usedBackupPlan) {
      usedBackupPatterns.push(pattern);
    }

    const owner = pattern.owner || '未分配';
    if (!ownerStats[owner]) {
      ownerStats[owner] = { total: 0, completed: 0, needAssistance: 0 };
    }
    ownerStats[owner].total++;
    if (item.completed) ownerStats[owner].completed++;
    if (item.needAssistance || item.actualStatus === '需协助') ownerStats[owner].needAssistance++;

    const matChecks = item.materialsPrepared || {};
    pattern.materials.forEach(mat => {
      const matEntry = {
        name: mat.name,
        quantity: mat.quantity,
        note: mat.note,
        pattern: pattern.name,
      };
      if (matChecks[mat.id]) {
        preparedMaterials.push(matEntry);
      } else {
        missingMaterials.push(matEntry);
      }
    });
  });

  return {
    planDuration,
    actualDuration,
    durationDifference: actualDuration - planDuration,
    incompletePatterns,
    assistancePatterns,
    missedRisks,
    usedBackupPatterns,
    ownerStats,
    materialsReview: {
      prepared: preparedMaterials,
      missing: missingMaterials,
    },
    overallNotes: '',
  };
}

export function generateReviewText(summary: ReviewSummary, execution: PracticeExecution): string {
  const lines: string[] = [];
  const planName = execution.planSnapshot.name || '未命名方案';

  lines.push(`# 练习复盘报告 - ${planName}`);
  lines.push('');
  lines.push(`生成时间：${new Date().toLocaleString('zh-CN')}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## 一、时长对比');
  lines.push('');
  lines.push(`- 计划总时长：${summary.planDuration} 分钟`);
  lines.push(`- 实际总时长：${summary.actualDuration} 分钟`);
  const diffText = summary.durationDifference >= 0
    ? `超出 ${summary.durationDifference} 分钟`
    : `节省 ${Math.abs(summary.durationDifference)} 分钟`;
  lines.push(`- 差异：${diffText}`);
  lines.push('');

  lines.push('## 二、逐项执行记录');
  lines.push('');
  execution.items.forEach((item, idx) => {
    const p = item.patternSnapshot;
    lines.push(`### ${idx + 1}. ${p.name || '未命名图样'}`);
    lines.push(`- 计划时长：${p.estimatedDuration} 分钟`);
    lines.push(`- 实际时长：${item.actualDuration} 分钟`);
    lines.push(`- 完成状态：${item.completed ? '已完成' : '未完成'}`);
    lines.push(`- 是否需要协助：${item.needAssistance ? '是' : '否'}`);
    lines.push(`- 实际状态：${item.actualStatus}`);
    if (item.usedBackupPlan) lines.push(`- 使用了备用方案：是`);
    if (!item.riskReminded && p.riskWarnings) lines.push(`- ⚠ 风险提醒遗漏：${p.riskWarnings}`);
    if (item.issuesOnSite) lines.push(`- 现场问题：${item.issuesOnSite}`);
    lines.push('');
  });

  lines.push('## 三、未完成图样');
  lines.push('');
  if (summary.incompletePatterns.length === 0) {
    lines.push('全部图样已完成。');
  } else {
    summary.incompletePatterns.forEach((p, idx) => {
      lines.push(`${idx + 1}. ${p.name}（负责人：${p.owner || '未分配'}）`);
    });
  }
  lines.push('');

  lines.push('## 四、需协助图样');
  lines.push('');
  if (summary.assistancePatterns.length === 0) {
    lines.push('无需要协助的图样。');
  } else {
    summary.assistancePatterns.forEach((p, idx) => {
      lines.push(`${idx + 1}. ${p.name}（负责人：${p.owner || '未分配'}）`);
    });
  }
  lines.push('');

  lines.push('## 五、风险提醒遗漏');
  lines.push('');
  if (summary.missedRisks.length === 0) {
    lines.push('所有风险提醒均已落实。');
  } else {
    summary.missedRisks.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.pattern.name}：${item.warning}`);
    });
  }
  lines.push('');

  lines.push('## 六、备用方案使用情况');
  lines.push('');
  if (summary.usedBackupPatterns.length === 0) {
    lines.push('未使用任何备用方案。');
  } else {
    summary.usedBackupPatterns.forEach((p, idx) => {
      const backupPlan = execution.items.find(i => i.patternId === p.id)?.patternSnapshot.backupPlan;
      lines.push(`${idx + 1}. ${p.name}`);
      if (backupPlan) lines.push(`   备用方案：${backupPlan}`);
    });
  }
  lines.push('');

  lines.push('## 七、负责人维度统计');
  lines.push('');
  const ownerNames = Object.keys(summary.ownerStats);
  if (ownerNames.length === 0) {
    lines.push('暂无负责人数据。');
  } else {
    ownerNames.forEach(owner => {
      const stats = summary.ownerStats[owner];
      const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
      lines.push(`- ${owner}：`);
      lines.push(`  - 负责图样：${stats.total} 项`);
      lines.push(`  - 已完成：${stats.completed} 项（${completionRate}%）`);
      lines.push(`  - 需协助：${stats.needAssistance} 项`);
    });
  }
  lines.push('');

  lines.push('## 八、材料准备清单回顾');
  lines.push('');

  lines.push('### 已准备材料');
  if (summary.materialsReview.prepared.length === 0) {
    lines.push('无已准备材料记录。');
  } else {
    summary.materialsReview.prepared.forEach((m, idx) => {
      const qty = m.quantity ? ` × ${m.quantity}` : '';
      const note = m.note ? `（${m.note}）` : '';
      lines.push(`${idx + 1}. [✓] ${m.name}${qty}${note} - ${m.pattern}`);
    });
  }
  lines.push('');

  lines.push('### 遗漏材料');
  if (summary.materialsReview.missing.length === 0) {
    lines.push('材料准备齐全，无遗漏。');
  } else {
    summary.materialsReview.missing.forEach((m, idx) => {
      const qty = m.quantity ? ` × ${m.quantity}` : '';
      const note = m.note ? `（${m.note}）` : '';
      lines.push(`${idx + 1}. [ ] ${m.name}${qty}${note} - ${m.pattern}`);
    });
  }
  lines.push('');

  if (summary.overallNotes) {
    lines.push('## 九、总体备注');
    lines.push('');
    lines.push(summary.overallNotes);
    lines.push('');
  }

  return lines.join('\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

export function createReviewRecord(execution: PracticeExecution, summary: ReviewSummary): ReviewRecord {
  const now = Date.now();
  return {
    id: `review_${now}_${Math.random().toString(36).slice(2, 9)}`,
    planId: execution.planId,
    planName: execution.planSnapshot.name || '未命名方案',
    executionId: execution.id,
    summary,
    execution,
    createdAt: now,
    updatedAt: now,
  };
}
