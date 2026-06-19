import { FilterState, DIFFICULTY_OPTIONS, STATUS_OPTIONS, Difficulty, PracticeStatus } from '../types';

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  themes: string[];
  owners: string[];
}

export default function FilterBar({ filters, onChange, themes, owners }: FilterBarProps) {
  const update = (patch: Partial<FilterState>) => {
    onChange({ ...filters, ...patch });
  };

  return (
    <div className="filter-bar">
      <div className="filter-item">
        <label>关键字</label>
        <input
          type="text"
          placeholder="搜索图样名称、刀法要点..."
          value={filters.keyword}
          onChange={e => update({ keyword: e.target.value })}
        />
      </div>
      <div className="filter-item">
        <label>主题</label>
        <select value={filters.theme} onChange={e => update({ theme: e.target.value })}>
          <option value="">全部主题</option>
          {themes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="filter-item">
        <label>难度</label>
        <select value={filters.difficulty} onChange={e => update({ difficulty: e.target.value as Difficulty | '' })}>
          <option value="">全部难度</option>
          {DIFFICULTY_OPTIONS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div className="filter-item">
        <label>状态</label>
        <select value={filters.status} onChange={e => update({ status: e.target.value as PracticeStatus | '' })}>
          <option value="">全部状态</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="filter-item">
        <label>负责人</label>
        <select value={filters.owner} onChange={e => update({ owner: e.target.value })}>
          <option value="">全部负责人</option>
          {owners.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>
      <div className="filter-actions">
        <button className="btn btn-ghost" onClick={() => onChange({ keyword: '', theme: '', difficulty: '', status: '', owner: '' })}>
          清除筛选
        </button>
      </div>
    </div>
  );
}
