import { useState, useMemo } from 'react';
import { ReviewRecord, PaperPattern, PracticePlan } from '../types';
import {
  X, TrendingUp, TrendingDown, Minus, CheckCircle, Clock, HelpCircle,
  AlertTriangle, FileText, Package, Filter, BarChart3, Target,
  ChevronDown, ChevronRight, ExternalLink, Users, FolderOpen, Calendar,
} from 'lucide-react';

interface TrendDashboardProps {
  reviews: ReviewRecord[];
  plans: PracticePlan[];
  patterns: PaperPattern[];
  onViewReview: (review: ReviewRecord) => void;
  onNavigatePattern: (patternId: string) => void;
  onClose: () => void;
}

interface DashboardFilters {
  planId: string;
  owner: string;
  theme: string;
  dateFrom: string;
  dateTo: string;
}

interface KPIData {
  completionRate: number;
  completionTrend: number;
  durationDeviation: number;
  durationTrend: number;
  assistanceCount: number;
  assistanceTrend: number;
  riskMissedCount: number;
  riskMissedTrend: number;
  backupUsedCount: number;
  backupTrend: number;
  materialsMissingCount: number;
  materialsTrend: number;
}

interface TrendPoint {
  label: string;
  value: number;
  reviewId: string;
}

interface PatternIssueSummary {
  patternId: string;
  patternName: string;
  theme: string;
  owner: string;
  assistanceCount: number;
  riskMissedCount: number;
  backupUsedCount: number;
  materialsMissingCount: number;
  durationDeviation: number;
  completionRate: number;
  linkedReviewIds: string[];
}

function computeTrend(points: number[]): number {
  if (points.length < 2) return 0;
  const recent = points.slice(-3);
  const older = points.slice(-6, -3);
  if (older.length === 0) return 0;
  const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const olderAvg = older.reduce((s, v) => s + v, 0) / older.length;
  if (olderAvg === 0) return recentAvg > 0 ? 1 : 0;
  return (recentAvg - olderAvg) / Math.abs(olderAvg);
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
}

export default function TrendDashboard({
  reviews,
  plans,
  patterns,
  onViewReview,
  onNavigatePattern,
  onClose,
}: TrendDashboardProps) {
  const [filters, setFilters] = useState<DashboardFilters>({
    planId: '',
    owner: '',
    theme: '',
    dateFrom: '',
    dateTo: '',
  });
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  const allOwners = useMemo(() => {
    const set = new Set<string>();
    plans.forEach(p => p.owner && set.add(p.owner));
    patterns.forEach(p => p.owner && set.add(p.owner));
    reviews.forEach(r => r.execution.items.forEach(i => {
      i.patternSnapshot.owner && set.add(i.patternSnapshot.owner);
    }));
    return Array.from(set);
  }, [plans, patterns, reviews]);

  const allThemes = useMemo(() => {
    const set = new Set<string>();
    patterns.forEach(p => p.theme && set.add(p.theme));
    reviews.forEach(r => r.execution.items.forEach(i => {
      i.patternSnapshot.theme && set.add(i.patternSnapshot.theme);
    }));
    return Array.from(set);
  }, [patterns, reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      if (filters.planId && r.planId !== filters.planId) return false;
      if (filters.owner) {
        const planOwner = r.execution.planSnapshot.owner;
        const itemOwners = r.execution.items.map(i => i.patternSnapshot.owner).filter(Boolean);
        if (planOwner !== filters.owner && !itemOwners.includes(filters.owner)) return false;
      }
      if (filters.theme) {
        const itemThemes = r.execution.items.map(i => i.patternSnapshot.theme).filter(Boolean);
        if (!itemThemes.includes(filters.theme)) return false;
      }
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom).getTime();
        if (r.createdAt < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo).getTime() + 86400000;
        if (r.createdAt > to) return false;
      }
      return true;
    }).sort((a, b) => a.createdAt - b.createdAt);
  }, [reviews, filters]);

  const kpiData: KPIData = useMemo(() => {
    if (filteredReviews.length === 0) {
      return {
        completionRate: 0, completionTrend: 0,
        durationDeviation: 0, durationTrend: 0,
        assistanceCount: 0, assistanceTrend: 0,
        riskMissedCount: 0, riskMissedTrend: 0,
        backupUsedCount: 0, backupTrend: 0,
        materialsMissingCount: 0, materialsTrend: 0,
      };
    }

    const rates: number[] = [];
    let totalItems = 0;
    let totalCompleted = 0;
    let totalDurationDiff = 0;
    let totalAssistance = 0;
    let totalRiskMissed = 0;
    let totalBackup = 0;
    let totalMissing = 0;

    const rateHistory: number[] = [];
    const durationHistory: number[] = [];
    const assistHistory: number[] = [];
    const riskHistory: number[] = [];
    const backupHistory: number[] = [];
    const missingHistory: number[] = [];

    filteredReviews.forEach(r => {
      const items = r.execution.items;
      const completed = items.filter(i => i.completed).length;
      const rate = items.length > 0 ? (completed / items.length) * 100 : 0;
      rateHistory.push(rate);
      totalItems += items.length;
      totalCompleted += completed;

      const avgDiff = items.length > 0
        ? items.reduce((s, i) => s + (i.actualDuration - i.patternSnapshot.estimatedDuration), 0) / items.length
        : 0;
      durationHistory.push(avgDiff);
      totalDurationDiff += items.reduce((s, i) => s + (i.actualDuration - i.patternSnapshot.estimatedDuration), 0);

      const assist = r.summary.assistancePatterns.length;
      assistHistory.push(assist);
      totalAssistance += assist;

      const risk = r.summary.missedRisks.length;
      riskHistory.push(risk);
      totalRiskMissed += risk;

      const backup = r.summary.usedBackupPatterns.length;
      backupHistory.push(backup);
      totalBackup += backup;

      const missing = r.summary.materialsReview.missing.length;
      missingHistory.push(missing);
      totalMissing += missing;
    });

    rates.push(totalItems > 0 ? (totalCompleted / totalItems) * 100 : 0);

    return {
      completionRate: Math.round(rates[0]),
      completionTrend: computeTrend(rateHistory),
      durationDeviation: Math.round(totalDurationDiff / filteredReviews.length),
      durationTrend: computeTrend(durationHistory),
      assistanceCount: totalAssistance,
      assistanceTrend: computeTrend(assistHistory),
      riskMissedCount: totalRiskMissed,
      riskMissedTrend: computeTrend(riskHistory),
      backupUsedCount: totalBackup,
      backupTrend: computeTrend(backupHistory),
      materialsMissingCount: totalMissing,
      materialsTrend: computeTrend(missingHistory),
    };
  }, [filteredReviews]);

  const trendData: Record<string, TrendPoint[]> = useMemo(() => {
    const completion: TrendPoint[] = [];
    const duration: TrendPoint[] = [];
    const assistance: TrendPoint[] = [];
    const riskMissed: TrendPoint[] = [];
    const backup: TrendPoint[] = [];
    const materialsMissing: TrendPoint[] = [];

    filteredReviews.forEach(r => {
      const items = r.execution.items;
      const completed = items.filter(i => i.completed).length;
      const rate = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
      completion.push({ label: formatDate(r.createdAt), value: rate, reviewId: r.id });

      const avgDiff = items.length > 0
        ? Math.round(items.reduce((s, i) => s + (i.actualDuration - i.patternSnapshot.estimatedDuration), 0) / items.length)
        : 0;
      duration.push({ label: formatDate(r.createdAt), value: avgDiff, reviewId: r.id });

      assistance.push({ label: formatDate(r.createdAt), value: r.summary.assistancePatterns.length, reviewId: r.id });
      riskMissed.push({ label: formatDate(r.createdAt), value: r.summary.missedRisks.length, reviewId: r.id });
      backup.push({ label: formatDate(r.createdAt), value: r.summary.usedBackupPatterns.length, reviewId: r.id });
      materialsMissing.push({ label: formatDate(r.createdAt), value: r.summary.materialsReview.missing.length, reviewId: r.id });
    });

    return { completion, duration, assistance, riskMissed, backup, materialsMissing };
  }, [filteredReviews]);

  const patternIssues: PatternIssueSummary[] = useMemo(() => {
    const map = new Map<string, PatternIssueSummary>();

    filteredReviews.forEach(r => {
      r.execution.items.forEach(item => {
        const pid = item.patternId;
        if (!map.has(pid)) {
          map.set(pid, {
            patternId: pid,
            patternName: item.patternSnapshot.name || '未命名',
            theme: item.patternSnapshot.theme || '',
            owner: item.patternSnapshot.owner || '',
            assistanceCount: 0,
            riskMissedCount: 0,
            backupUsedCount: 0,
            materialsMissingCount: 0,
            durationDeviation: 0,
            completionRate: 0,
            linkedReviewIds: [],
          });
        }
        const entry = map.get(pid)!;
        if (item.needAssistance || item.actualStatus === '需协助') entry.assistanceCount++;
        if (item.patternSnapshot.riskWarnings && !item.riskReminded) entry.riskMissedCount++;
        if (item.usedBackupPlan) entry.backupUsedCount++;
        const missingMats = Object.entries(item.materialsPrepared || {})
          .filter(([, v]) => !v).length;
        entry.materialsMissingCount += missingMats;
        entry.durationDeviation += item.actualDuration - item.patternSnapshot.estimatedDuration;
        entry.completionRate += item.completed ? 1 : 0;
        if (!entry.linkedReviewIds.includes(r.id)) entry.linkedReviewIds.push(r.id);
      });
    });

    const result = Array.from(map.values()).map(entry => {
      const reviewCount = entry.linkedReviewIds.length;
      return {
        ...entry,
        durationDeviation: reviewCount > 0 ? Math.round(entry.durationDeviation / reviewCount) : 0,
        completionRate: reviewCount > 0 ? Math.round((entry.completionRate / reviewCount) * 100) : 0,
      };
    });

    const totalIssues = (e: PatternIssueSummary) =>
      e.assistanceCount + e.riskMissedCount + e.backupUsedCount + e.materialsMissingCount;

    return result.sort((a, b) => totalIssues(b) - totalIssues(a));
  }, [filteredReviews]);

  const issueScore = (p: PatternIssueSummary) =>
    p.assistanceCount * 3 + p.riskMissedCount * 4 + p.backupUsedCount * 2 + p.materialsMissingCount * 2 + (p.completionRate < 80 ? 5 : 0);

  const recommendations = useMemo(() => {
    const recs: { patternId: string; patternName: string; type: string; message: string; priority: 'high' | 'medium' | 'low' }[] = [];

    patternIssues.forEach(p => {
      if (p.riskMissedCount > 0) {
        recs.push({
          patternId: p.patternId,
          patternName: p.patternName,
          type: 'risk',
          message: `风险提醒遗漏 ${p.riskMissedCount} 次，建议补充风险提示说明`,
          priority: p.riskMissedCount >= 2 ? 'high' : 'medium',
        });
      }
      if (p.assistanceCount > 0) {
        recs.push({
          patternId: p.patternId,
          patternName: p.patternName,
          type: 'assist',
          message: `需协助 ${p.assistanceCount} 次，建议优化步骤说明或降低难度`,
          priority: p.assistanceCount >= 3 ? 'high' : 'medium',
        });
      }
      if (p.durationDeviation > 10) {
        recs.push({
          patternId: p.patternId,
          patternName: p.patternName,
          type: 'duration',
          message: `平均超时 ${p.durationDeviation} 分钟，建议调整预估时长或拆分步骤`,
          priority: p.durationDeviation > 20 ? 'high' : 'low',
        });
      }
      if (p.backupUsedCount > 0) {
        recs.push({
          patternId: p.patternId,
          patternName: p.patternName,
          type: 'backup',
          message: `使用了备用方案 ${p.backupUsedCount} 次，建议将备用方案整合为标准流程`,
          priority: 'low',
        });
      }
      if (p.materialsMissingCount > 0) {
        recs.push({
          patternId: p.patternId,
          patternName: p.patternName,
          type: 'material',
          message: `材料缺漏 ${p.materialsMissingCount} 次，建议更新材料清单并提前核对`,
          priority: p.materialsMissingCount >= 3 ? 'high' : 'medium',
        });
      }
      if (p.completionRate < 80) {
        recs.push({
          patternId: p.patternId,
          patternName: p.patternName,
          type: 'completion',
          message: `完成率 ${p.completionRate}%，建议调整练习安排或增加辅助说明`,
          priority: p.completionRate < 50 ? 'high' : 'medium',
        });
      }
    });

    recs.sort((a, b) => {
      const pr = { high: 0, medium: 1, low: 2 };
      return pr[a.priority] - pr[b.priority];
    });

    return recs;
  }, [patternIssues]);

  const renderTrendIcon = (trend: number, inverse = false) => {
    const effective = inverse ? -trend : trend;
    if (Math.abs(effective) < 0.05) return <Minus size={14} className="trend-neutral" />;
    if (effective > 0) return <TrendingUp size={14} className={inverse ? 'trend-bad' : 'trend-good'} />;
    return <TrendingDown size={14} className={inverse ? 'trend-good' : 'trend-bad'} />;
  };

  const renderMiniChart = (data: TrendPoint[], color: string, invertY = false) => {
    if (data.length === 0) {
      return <div className="mini-chart-empty">暂无数据</div>;
    }
    const maxVal = Math.max(...data.map(d => Math.abs(d.value)), 1);
    const width = 100;
    const height = 40;
    const stepX = data.length > 1 ? width / (data.length - 1) : width;

    const points = data.map((d, i) => {
      const x = i * stepX;
      const normalized = invertY ? -d.value / maxVal : d.value / maxVal;
      const y = height / 2 - (normalized * (height / 2 - 2));
      return { x, y: Math.max(2, Math.min(height - 2, y)), d };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = pathD + ` L ${points[points.length - 1].x} ${height} L 0 ${height} Z`;

    return (
      <div className="mini-chart-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="mini-chart-svg" preserveAspectRatio="none">
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="var(--gray-200)" strokeWidth="0.5" strokeDasharray="2,2" />
          <path d={areaD} fill={`${color}15`} />
          <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="2"
              fill={color}
              className="mini-chart-dot"
              onClick={() => {
                const review = filteredReviews.find(r => r.id === p.d.reviewId);
                if (review) onViewReview(review);
              }}
            />
          ))}
        </svg>
        <div className="mini-chart-labels">
          {data.length > 0 && <span className="chart-label-first">{data[0].label}</span>}
          {data.length > 1 && <span className="chart-label-last">{data[data.length - 1].label}</span>}
        </div>
      </div>
    );
  };

  const clearFilters = () => {
    setFilters({ planId: '', owner: '', theme: '', dateFrom: '', dateTo: '' });
  };

  const hasActiveFilters = filters.planId || filters.owner || filters.theme || filters.dateFrom || filters.dateTo;

  const getReviewById = (id: string) => filteredReviews.find(r => r.id === id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large trend-dashboard-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header trend-dashboard-header">
          <h3>
            <BarChart3 size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} />
            练习表现趋势看板
          </h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="trend-dashboard-body">
          <div className="dashboard-filters">
            <div className="dashboard-filters-left">
              <Filter size={14} />
              <span className="filter-label">筛选条件</span>
            </div>
            <div className="dashboard-filters-fields">
              <div className="filter-item">
                <label>方案</label>
                <select
                  value={filters.planId}
                  onChange={e => setFilters(prev => ({ ...prev, planId: e.target.value }))}
                >
                  <option value="">全部方案</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name || '未命名方案'}</option>
                  ))}
                </select>
              </div>
              <div className="filter-item">
                <label>负责人</label>
                <select
                  value={filters.owner}
                  onChange={e => setFilters(prev => ({ ...prev, owner: e.target.value }))}
                >
                  <option value="">全部负责人</option>
                  {allOwners.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div className="filter-item">
                <label>主题</label>
                <select
                  value={filters.theme}
                  onChange={e => setFilters(prev => ({ ...prev, theme: e.target.value }))}
                >
                  <option value="">全部主题</option>
                  {allThemes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="filter-item">
                <label>开始日期</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>
              <div className="filter-item">
                <label>结束日期</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            </div>
            {hasActiveFilters && (
              <button className="btn btn-small btn-ghost" onClick={clearFilters}>
                清除筛选
              </button>
            )}
          </div>

          {filteredReviews.length === 0 ? (
            <div className="dashboard-empty">
              <BarChart3 size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <p>暂无匹配的复盘数据</p>
              <p className="empty-hint">完成练习执行并生成复盘记录后，即可查看趋势分析</p>
            </div>
          ) : (
            <>
              <div className="dashboard-summary-bar">
                <span className="summary-item">
                  <FolderOpen size={14} />
                  {filteredReviews.length} 次复盘
                </span>
                <span className="summary-item">
                  <Target size={14} />
                  涵盖 {patternIssues.length} 个图样
                </span>
                <span className="summary-item">
                  <Calendar size={14} />
                  {formatDate(filteredReviews[0].createdAt)} - {formatDate(filteredReviews[filteredReviews.length - 1].createdAt)}
                </span>
              </div>

              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-header">
                    <CheckCircle size={16} className="kpi-icon icon-success" />
                    <span className="kpi-title">完成率</span>
                    {renderTrendIcon(kpiData.completionTrend)}
                  </div>
                  <div className={`kpi-value ${kpiData.completionRate >= 80 ? 'stat-ok' : kpiData.completionRate >= 50 ? 'stat-warn' : 'stat-danger'}`}>
                    {kpiData.completionRate}%
                  </div>
                  <div className="kpi-chart">
                    {renderMiniChart(trendData.completion, '#10b981')}
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <Clock size={16} className="kpi-icon icon-warn" />
                    <span className="kpi-title">耗时偏差</span>
                    {renderTrendIcon(kpiData.durationTrend, true)}
                  </div>
                  <div className={`kpi-value ${kpiData.durationDeviation <= 0 ? 'stat-ok' : kpiData.durationDeviation <= 10 ? 'stat-warn' : 'stat-danger'}`}>
                    {kpiData.durationDeviation > 0 ? '+' : ''}{kpiData.durationDeviation}min
                  </div>
                  <div className="kpi-chart">
                    {renderMiniChart(trendData.duration, '#f59e0b', true)}
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <HelpCircle size={16} className="kpi-icon icon-danger" />
                    <span className="kpi-title">需协助</span>
                    {renderTrendIcon(kpiData.assistanceTrend, true)}
                  </div>
                  <div className={`kpi-value ${kpiData.assistanceCount === 0 ? 'stat-ok' : kpiData.assistanceCount <= 2 ? 'stat-warn' : 'stat-danger'}`}>
                    {kpiData.assistanceCount} 次
                  </div>
                  <div className="kpi-chart">
                    {renderMiniChart(trendData.assistance, '#ef4444', true)}
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <AlertTriangle size={16} className="kpi-icon icon-danger" />
                    <span className="kpi-title">风险遗漏</span>
                    {renderTrendIcon(kpiData.riskMissedTrend, true)}
                  </div>
                  <div className={`kpi-value ${kpiData.riskMissedCount === 0 ? 'stat-ok' : 'stat-danger'}`}>
                    {kpiData.riskMissedCount} 次
                  </div>
                  <div className="kpi-chart">
                    {renderMiniChart(trendData.riskMissed, '#dc2626', true)}
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <FileText size={16} className="kpi-icon icon-info" />
                    <span className="kpi-title">备用方案使用</span>
                    {renderTrendIcon(kpiData.backupTrend, true)}
                  </div>
                  <div className={`kpi-value ${kpiData.backupUsedCount === 0 ? 'stat-ok' : 'stat-warn'}`}>
                    {kpiData.backupUsedCount} 次
                  </div>
                  <div className="kpi-chart">
                    {renderMiniChart(trendData.backup, '#3b82f6', true)}
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <Package size={16} className="kpi-icon icon-warn" />
                    <span className="kpi-title">材料缺漏</span>
                    {renderTrendIcon(kpiData.materialsTrend, true)}
                  </div>
                  <div className={`kpi-value ${kpiData.materialsMissingCount === 0 ? 'stat-ok' : 'stat-warn'}`}>
                    {kpiData.materialsMissingCount} 次
                  </div>
                  <div className="kpi-chart">
                    {renderMiniChart(trendData.materialsMissing, '#f97316', true)}
                  </div>
                </div>
              </div>

              <div className="dashboard-sections">
                <div className="dashboard-section">
                  <div className="section-header">
                    <h4>
                      <Users size={16} />
                      图样问题定位
                    </h4>
                    <span className="section-count">{patternIssues.filter(p => issueScore(p) > 0).length} 项需关注</span>
                  </div>
                  <div className="pattern-issues-list">
                    {patternIssues.filter(p => issueScore(p) > 0).map(p => {
                      const isExpanded = expandedIssue === p.patternId;
                      return (
                        <div key={p.patternId} className={`pattern-issue-item ${isExpanded ? 'expanded' : ''}`}>
                          <div
                            className="pattern-issue-header"
                            onClick={() => setExpandedIssue(isExpanded ? null : p.patternId)}
                          >
                            <div className="pattern-issue-left">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              <span className="pattern-issue-name">{p.patternName}</span>
                              {p.theme && <span className="tag tag-theme">{p.theme}</span>}
                              {p.owner && <span className="tag">{p.owner}</span>}
                            </div>
                            <div className="pattern-issue-badges">
                              {p.assistanceCount > 0 && (
                                <span className="badge badge-danger"><HelpCircle size={10} /> 需协助 {p.assistanceCount}</span>
                              )}
                              {p.riskMissedCount > 0 && (
                                <span className="badge badge-danger"><AlertTriangle size={10} /> 风险遗漏 {p.riskMissedCount}</span>
                              )}
                              {p.materialsMissingCount > 0 && (
                                <span className="badge badge-warn"><Package size={10} /> 材料缺漏 {p.materialsMissingCount}</span>
                              )}
                              {p.backupUsedCount > 0 && (
                                <span className="badge badge-info"><FileText size={10} /> 备用方案 {p.backupUsedCount}</span>
                              )}
                              {p.durationDeviation > 5 && (
                                <span className="badge badge-warn"><Clock size={10} /> 超时 {p.durationDeviation}min</span>
                              )}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="pattern-issue-detail">
                              <div className="issue-detail-stats">
                                <div className="issue-stat">
                                  <span className="issue-stat-label">完成率</span>
                                  <span className={`issue-stat-value ${p.completionRate >= 80 ? 'stat-ok' : p.completionRate >= 50 ? 'stat-warn' : 'stat-danger'}`}>
                                    {p.completionRate}%
                                  </span>
                                </div>
                                <div className="issue-stat">
                                  <span className="issue-stat-label">平均耗时偏差</span>
                                  <span className={`issue-stat-value ${p.durationDeviation <= 0 ? 'stat-ok' : 'stat-warn'}`}>
                                    {p.durationDeviation > 0 ? '+' : ''}{p.durationDeviation} min
                                  </span>
                                </div>
                              </div>
                              <div className="issue-detail-actions">
                                <button
                                  className="btn btn-small"
                                  onClick={() => onNavigatePattern(p.patternId)}
                                >
                                  <ExternalLink size={12} /> 查看图样
                                </button>
                                {p.linkedReviewIds.slice(0, 3).map(rid => {
                                  const review = getReviewById(rid);
                                  if (!review) return null;
                                  return (
                                    <button
                                      key={rid}
                                      className="btn btn-small btn-secondary"
                                      onClick={() => onViewReview(review)}
                                    >
                                      <FileText size={12} /> 复盘 {formatDate(review.createdAt)}
                                    </button>
                                  );
                                })}
                                {p.linkedReviewIds.length > 3 && (
                                  <span className="more-reviews">+{p.linkedReviewIds.length - 3} 更多</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {patternIssues.every(p => issueScore(p) === 0) && (
                      <div className="no-issues">
                        <CheckCircle size={20} className="icon-success" />
                        <span>所有图样表现良好，无需特别关注</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="dashboard-section">
                  <div className="section-header">
                    <h4>
                      <Target size={16} />
                      优化建议
                    </h4>
                    <span className="section-count">{recommendations.length} 条建议</span>
                  </div>
                  <div className="recommendations-list">
                    {recommendations.map((rec, idx) => (
                      <div key={idx} className={`recommendation-item priority-${rec.priority}`}>
                        <div className="rec-priority-dot" />
                        <div className="rec-content">
                          <span className="rec-pattern">{rec.patternName}</span>
                          <span className="rec-message">{rec.message}</span>
                        </div>
                        <div className="rec-actions">
                          <button
                            className="btn btn-small btn-ghost"
                            onClick={() => onNavigatePattern(rec.patternId)}
                          >
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {recommendations.length === 0 && (
                      <div className="no-issues">
                        <CheckCircle size={20} className="icon-success" />
                        <span>暂无优化建议，所有指标表现良好</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
