import { useState, useEffect } from 'react';
import api from '@/lib/api';

const MORNING_LABELS = {
  before_730: 'Before 7:30',
  '730_830': '7:30 – 8:30',
  '830_930': '8:30 – 9:30',
  after_930: 'After 9:30',
};
const EVENING_LABELS = {
  before_5: 'Before 5 PM',
  '5_6': '5 – 6 PM',
  '6_7': '6 – 7 PM',
  after_7: 'After 7 PM',
};

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function TrendArrow({ current, previous }) {
  if (!previous || previous === 0) return null;
  const up = current >= previous;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ml-1 ${up ? 'text-green-400' : 'text-red-400'}`}>
      {up ? '↑' : '↓'}
      {Math.abs(Math.round(((current - previous) / previous) * 100))}%
    </span>
  );
}

function KpiCard({ label, value, sub, trend }) {
  return (
    <div className="bg-surface-1 border border-surface-border rounded-2xl p-5 space-y-1">
      <p className="text-slate-400 text-xs uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
        {trend}
      </div>
      {sub && <p className="text-slate-500 text-xs">{sub}</p>}
    </div>
  );
}

function BandChart({ title, data, labelMap }) {
  const max = Math.max(...data.map(d => Number(d.count)), 1);
  const total = data.reduce((s, d) => s + Number(d.count), 0);
  return (
    <div className="bg-surface-1 border border-surface-border rounded-2xl p-5 space-y-4">
      <h3 className="text-white font-semibold text-sm">{title}</h3>
      <div className="space-y-3">
        {data.map((row) => {
          const key = Object.keys(labelMap).find(k => k === row.morning_band || k === row.evening_band) || '';
          const label = labelMap[key] || key;
          const count = Number(row.count);
          const pct = (count / max) * 100;
          const pctOfTotal = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">{label}</span>
                <span className="text-slate-400 tabular-nums">
                  {count} <span className="text-slate-600">({pctOfTotal}%)</span>
                </span>
              </div>
              <div className="h-3 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {data.length === 0 && <p className="text-slate-500 text-sm">No data yet</p>}
      </div>
    </div>
  );
}

/* SVG-based bar chart for daily responses */
function DailyChart({ data }) {
  const [hovered, setHovered] = useState(null);
  if (!data.length) return null;

  const recent = [...data].slice(0, 14).reverse();
  const max = Math.max(...recent.map(d => Number(d.count)), 1);

  const SVG_W = 700;
  const SVG_H = 180;
  const PAD_LEFT = 28;
  const PAD_RIGHT = 8;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 40;
  const chartW = SVG_W - PAD_LEFT - PAD_RIGHT;
  const chartH = SVG_H - PAD_TOP - PAD_BOTTOM;
  const barCount = recent.length;
  const gap = 4;
  const barW = Math.max(8, (chartW - gap * (barCount - 1)) / barCount);

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(max * f));

  const formatLabel = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="bg-surface-1 border border-surface-border rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">Responses by Day</h3>
        <span className="text-slate-500 text-xs">Last 14 days</span>
      </div>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full"
          style={{ minWidth: '320px', height: '180px' }}
          onMouseLeave={() => setHovered(null)}
        >
          {/* Y-axis gridlines */}
          {gridLines.map((val) => {
            const y = PAD_TOP + chartH - (val / max) * chartH;
            return (
              <g key={val}>
                <line
                  x1={PAD_LEFT} y1={y}
                  x2={SVG_W - PAD_RIGHT} y2={y}
                  stroke="rgba(255,255,255,0.06)" strokeWidth="1"
                />
                <text
                  x={PAD_LEFT - 4} y={y + 4}
                  textAnchor="end" fontSize="9"
                  fill="rgba(255,255,255,0.3)"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {recent.map((row, i) => {
            const count = Number(row.count);
            const barH = Math.max((count / max) * chartH, count > 0 ? 4 : 0);
            const x = PAD_LEFT + i * (barW + gap);
            const y = PAD_TOP + chartH - barH;
            const isHov = hovered === i;

            return (
              <g key={row.date}>
                <rect
                  x={x} y={y} width={barW} height={barH}
                  rx="3" ry="3"
                  fill={isHov ? '#22c55e' : 'rgba(34,197,94,0.55)'}
                  className="transition-colors duration-150 cursor-default"
                  onMouseEnter={() => setHovered(i)}
                />
                {/* Count label above bar */}
                {count > 0 && (
                  <text
                    x={x + barW / 2} y={y - 4}
                    textAnchor="middle" fontSize="9"
                    fill={isHov ? '#22c55e' : 'rgba(255,255,255,0.5)'}
                  >
                    {count}
                  </text>
                )}
                {/* Date label — rotated -40° below bar */}
                <text
                  x={x + barW / 2}
                  y={PAD_TOP + chartH + 14}
                  textAnchor="end"
                  fontSize="9"
                  fill={isHov ? '#e2e8f0' : 'rgba(255,255,255,0.3)'}
                  transform={`rotate(-40, ${x + barW / 2}, ${PAD_TOP + chartH + 14})`}
                >
                  {formatLabel(row.date)}
                </text>
              </g>
            );
          })}

          {/* Hover tooltip */}
          {hovered !== null && recent[hovered] && (() => {
            const row = recent[hovered];
            const count = Number(row.count);
            const x = PAD_LEFT + hovered * (barW + gap) + barW / 2;
            const barH = Math.max((count / max) * chartH, count > 0 ? 4 : 0);
            const tipY = PAD_TOP + chartH - barH - 28;
            const tipX = Math.min(Math.max(x - 32, PAD_LEFT), SVG_W - PAD_RIGHT - 70);
            return (
              <g>
                <rect x={tipX} y={tipY} width={68} height={20} rx="4" fill="rgba(15,15,25,0.9)" stroke="rgba(34,197,94,0.4)" strokeWidth="1" />
                <text x={tipX + 34} y={tipY + 13} textAnchor="middle" fontSize="10" fill="white" fontWeight="600">
                  {count} response{count !== 1 ? 's' : ''}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}

function ODMatrix({ data }) {
  const grouped = {};
  data.forEach(row => {
    const key = `${row.origin_area} → ${row.destination_area}`;
    if (!grouped[key]) grouped[key] = { total: 0, rows: [] };
    grouped[key].total += Number(row.response_count);
    grouped[key].rows.push(row);
  });

  const sorted = Object.entries(grouped).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="bg-surface-1 border border-surface-border rounded-2xl p-5 space-y-4">
      <h3 className="text-white font-semibold text-sm">Origin–Destination Matrix</h3>
      {sorted.length === 0 && <p className="text-slate-500 text-sm">No survey data yet</p>}
      <div className="space-y-5">
        {sorted.map(([corridor, { total, rows }], idx) => (
          <div
            key={corridor}
            className={`space-y-2 rounded-xl p-3 border ${idx === 0 ? 'border-brand-500/30 bg-brand-500/5' : 'border-surface-border bg-surface-2/50'}`}
          >
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${idx === 0 ? 'bg-brand-500 text-white' : 'bg-surface-3 text-slate-400'}`}>
                  {idx + 1}
                </span>
                <span className="text-white text-sm font-medium">{corridor}</span>
              </div>
              <span className={`text-sm font-semibold tabular-nums ${idx === 0 ? 'text-brand-500' : 'text-slate-400'}`}>
                {total} response{total !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-slate-500 border-b border-surface-border">
                    <th className="text-left py-1 pr-4 font-medium">Morning</th>
                    <th className="text-left py-1 pr-4 font-medium">Evening</th>
                    <th className="text-right py-1 font-medium">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-surface-border/50 hover:bg-surface-2/50 transition-colors">
                      <td className="py-1.5 pr-4 text-slate-300">{MORNING_LABELS[row.morning_band] || row.morning_band || '—'}</td>
                      <td className="py-1.5 pr-4 text-slate-300">{EVENING_LABELS[row.evening_band] || row.evening_band || '—'}</td>
                      <td className="py-1.5 text-right text-white font-medium tabular-nums">{row.response_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SurveyDashboard() {
  const [stats, setStats] = useState(null);
  const [odMatrix, setOdMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/admin/survey/stats'),
      api.get('/admin/survey/od-matrix'),
    ])
      .then(([s, od]) => { setStats(s); setOdMatrix(Array.isArray(od) ? od : []); })
      .catch((e) => setError(e.error || 'Failed to load survey data'))
      .finally(() => setLoading(false));
  }, []);

  const responsesByDay = stats?.responsesByDay || [];
  const last7Days = responsesByDay.slice(0, 7).reduce((sum, r) => sum + Number(r.count), 0);
  const prev7Days = responsesByDay.slice(7, 14).reduce((sum, r) => sum + Number(r.count), 0);

  const corridorTotals = odMatrix.reduce((acc, row) => {
    const key = `${row.origin_area} → ${row.destination_area}`;
    acc[key] = (acc[key] || 0) + Number(row.response_count);
    return acc;
  }, {});
  const sortedCorridors = Object.entries(corridorTotals).sort((a, b) => b[1] - a[1]);
  const topCorridor = sortedCorridors[0]?.[0] ?? '—';
  const topCorridorCount = sortedCorridors[0]?.[1] ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Survey Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Commute demand analysis from survey responses</p>
        </div>
        {loading && <Spinner />}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {!loading && stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Total Responses" value={stats.totalResponses} sub="all time" />
            <KpiCard
              label="Last 7 Days"
              value={last7Days}
              sub="new responses"
              trend={<TrendArrow current={last7Days} previous={prev7Days} />}
            />
            <KpiCard
              label="Top Corridor"
              value={topCorridor}
              sub={topCorridorCount > 0 ? `${topCorridorCount} total responses` : 'highest demand'}
            />
          </div>

          <DailyChart data={responsesByDay} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BandChart
              title="Morning Departure Preference"
              data={(stats.morningBands || []).map(r => ({ ...r, morning_band: r.morning_band }))}
              labelMap={MORNING_LABELS}
            />
            <BandChart
              title="Evening Return Preference"
              data={(stats.eveningBands || []).map(r => ({ ...r, evening_band: r.evening_band }))}
              labelMap={EVENING_LABELS}
            />
          </div>

          <ODMatrix data={odMatrix} />
        </>
      )}

      {!loading && !stats && !error && (
        <div className="text-center py-16 text-slate-500">No survey data available yet.</div>
      )}
    </div>
  );
}
