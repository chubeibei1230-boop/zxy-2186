import { PaperPattern, CheckIssue, AppSettings } from './types';

export function runChecks(patterns: PaperPattern[], settings: AppSettings): CheckIssue[] {
  const issues: CheckIssue[] = [];

  issues.push(...checkThemeConsecutive(patterns));
  issues.push(...checkDurationExceed(patterns, settings.totalDurationLimit));
  issues.push(...checkRiskMissing(patterns));
  issues.push(...checkOwnerTooMany(patterns, settings.maxItemsPerOwner));
  issues.push(...checkBackupMissing(patterns));

  return issues;
}

function checkThemeConsecutive(patterns: PaperPattern[]): CheckIssue[] {
  const issues: CheckIssue[] = [];
  if (patterns.length < 2) return issues;

  for (let i = 0; i < patterns.length - 1; i++) {
    if (!patterns[i].theme) continue;
    const consecutiveIds: string[] = [patterns[i].id];
    let j = i + 1;
    while (j < patterns.length && patterns[j].theme === patterns[i].theme) {
      consecutiveIds.push(patterns[j].id);
      j++;
    }
    if (consecutiveIds.length >= 3) {
      issues.push({
        type: 'theme_consecutive',
        severity: 'warning',
        message: `主题「${patterns[i].theme}」连续出现 ${consecutiveIds.length} 次，建议穿插其他主题以保持练习节奏`,
        patternIds: consecutiveIds,
      });
      i = j - 1;
    } else if (consecutiveIds.length === 2) {
      i = j - 1;
    }
  }
  return issues;
}

function checkDurationExceed(patterns: PaperPattern[], limit: number): CheckIssue[] {
  const total = patterns.reduce((sum, p) => sum + (p.estimatedDuration || 0), 0);
  if (total > limit) {
    return [{
      type: 'duration_exceed',
      severity: 'error',
      message: `总预计时长 ${total} 分钟，超过活动设定上限 ${limit} 分钟，超出 ${total - limit} 分钟`,
      patternIds: patterns.map(p => p.id),
    }];
  }
  return [];
}

function checkRiskMissing(patterns: PaperPattern[]): CheckIssue[] {
  const missing = patterns.filter(p => !p.riskWarnings.trim());
  if (missing.length > 0) {
    return [{
      type: 'risk_missing',
      severity: 'warning',
      message: `有 ${missing.length} 个图样未填写风险提醒，使用刀具时请确保安全提示到位`,
      patternIds: missing.map(p => p.id),
    }];
  }
  return [];
}

function checkOwnerTooMany(patterns: PaperPattern[], maxItems: number): CheckIssue[] {
  const ownerCount: Record<string, PaperPattern[]> = {};
  patterns.forEach(p => {
    if (!p.owner.trim()) return;
    if (!ownerCount[p.owner]) ownerCount[p.owner] = [];
    ownerCount[p.owner].push(p);
  });

  const issues: CheckIssue[] = [];
  Object.entries(ownerCount).forEach(([owner, items]) => {
    if (items.length > maxItems) {
      issues.push({
        type: 'owner_too_many',
        severity: 'warning',
        message: `负责人「${owner}」负责 ${items.length} 个条目，超过建议上限 ${maxItems} 个，建议分摊工作量`,
        patternIds: items.map(p => p.id),
      });
    }
  });
  return issues;
}

function checkBackupMissing(patterns: PaperPattern[]): CheckIssue[] {
  const missing = patterns.filter(p => !p.backupPlan.trim());
  if (missing.length > 0) {
    return [{
      type: 'backup_missing',
      severity: 'warning',
      message: `有 ${missing.length} 个图样未填写备用方案，建议为复杂或高风险图样准备 Plan B`,
      patternIds: missing.map(p => p.id),
    }];
  }
  return [];
}
