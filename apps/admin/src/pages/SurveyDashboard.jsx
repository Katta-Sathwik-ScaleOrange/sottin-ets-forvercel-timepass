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

function KpiCard({ label, value, sub }) {
  return (
    <div className="bg-surface-1 border border-surface-border rounded-2xl p-5 space-y-1">
      <p className="text-slate-400 text-xs uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
      {sub && <p className="text-slate-500 text-xs">{sub}</p>}
    </div>
  );
}

function BandChart({ title, data, labelMap }) {
  const max = Math.max(...data.map(d => Number(d.count)), 1);
  return (
    <div className="bg-surface-1 border border-surface-border rounded-2xl p-5 space-y-4">
      <h3 className="text-white font-semibold text-sm">{title}</h3>
      <div className="space-y-3">
        {data.map((row) => {
          const key = Object.keys(labelMap).find(k => k === row.morning_band || k === row.evening_band) || '';
          const label = labelMap[key] || key;
          const pct = (Number(row.count) / max) * 100;
          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">{label}</span>
                <span className="text-slate-400 tabular-nums">{row.count}</span>
              </div>
              <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        {data.length === 0 && <p className="text-slate-500 text-sm">No data yet</p>}
      </div>
    </div>
  );
}

function DailyChart({ data }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => Number(d.count)), 1);
  const recent = [...data].slice(0, 14).reverse();
  return (
    <div className="bg-surface-1 border border-surface-border rounded-2xl p-5 space-y-4">
      <h3 className="text-white font-semibold text-sm">Responses by Day (last 14 days)</h3>
      <div className="flex items-end gap-1 h-24">
        {recent.map((row) => {
          const h = Math.max((Number(row.count) / max) * 100, 4);
          return (
            <div key={row.date} className="flex-1 flex flex-col items-center gap-1 group">
              <div
                className="w-full bg-brand-500/60 hover:bg-brand-500 rounded-t transition-colors cursor-default"
                style={{ height: `${h}%` }}
                title={`${row.date}: ${row.count}`}
              />
              <span className="text-[9px] text-slate-600 group-hover:text-slate-400 transition-colors hidden sm:block">
                {new Date(row.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          );
        })}
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
      <div className="space-y-4">
        {sorted.map(([corridor, { total, rows }]) => (
          <div key={corridor} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-medium">{corridor}</span>
              <span className="text-brand-500 text-sm font-semibold tabular-nums">{total} responses</span>
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

  const last7Days = stats?.responsesByDay
    ?.slice(0, 7)
    .reduce((sum, r) => sum + Number(r.count), 0) ?? 0;

  const topCorridor = odMatrix.length > 0
    ? `${odMatrix[0].origin_area} → ${odMatrix[0].destination_area}`
    : '—';

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
            <KpiCard label="Last 7 Days" value={last7Days} sub="new responses" />
            <KpiCard label="Top Corridor" value={topCorridor} sub="highest demand" />
          </div>

          <DailyChart data={stats.responsesByDay || []} />

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
