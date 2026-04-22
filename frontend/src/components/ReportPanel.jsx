// Componente reutilizable para reportes visuales — Tema Laboratorio Oscuro
import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Download, FileText, Activity } from 'lucide-react';

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#06b6d4'];

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1217] border border-[#2a353d] rounded-md px-3 py-2 shadow-xl">
      {label && <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-mono" style={{ color: p.color || '#22c55e' }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const ReportPanel = ({ title, subtitle, primaryData = [], secondaryData = [], activity = [], onExportExcel, onExportPdf }) => {
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setChartsReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const safePrimaryData = useMemo(
    () => (primaryData?.length ? primaryData : [{ name: 'Sin datos', value: 0 }]),
    [primaryData]
  );

  const safeSecondaryData = useMemo(
    () => (secondaryData?.length ? secondaryData : [{ name: 'Sin datos', value: 1 }]),
    [secondaryData]
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
      {/* ── Charts panel ── */}
      <div className="xl:col-span-2 bg-[#0d1217] border border-[#2a353d] rounded-lg overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-5 py-3 border-b border-[#2a353d]">
          <div>
            <h3 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">{title}</h3>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
            <button
              onClick={onExportPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          {/* Bar chart */}
          <div className="h-[280px] w-full bg-[#0a0e12] border border-[#2a353d] rounded-md p-3">
            {chartsReady && (
              <ResponsiveContainer width="99%" height="100%" debounce={120}>
                <BarChart data={safePrimaryData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2228" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]}>
                    {safePrimaryData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie chart */}
          <div className="h-[280px] w-full bg-[#0a0e12] border border-[#2a353d] rounded-md p-3">
            {chartsReady && (
              <ResponsiveContainer width="99%" height="100%" debounce={120}>
                <PieChart>
                  <Pie
                    data={safeSecondaryData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={85}
                    innerRadius={40}
                    paddingAngle={3}
                  >
                    {safeSecondaryData.map((entry, index) => (
                      <Cell key={`pie-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Activity feed ── */}
      <div className="bg-[#0d1217] border border-[#2a353d] rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[#2a353d]">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Actividad reciente</span>
        </div>
        <div className="p-4 space-y-2 max-h-[340px] overflow-y-auto">
          {activity.length === 0 ? (
            <p className="text-xs font-mono text-slate-600 py-4 text-center">Sin actividad reciente</p>
          ) : (
            activity.map((item) => (
              <div key={item.id} className="bg-[#0a0e12] border border-[#2a353d] rounded-md p-3 hover:border-emerald-500/30 transition-colors">
                <p className="text-xs font-mono font-semibold text-slate-300">{item.title}</p>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5 leading-relaxed">{item.detail}</p>
                {item.date && <p className="text-[9px] font-mono text-emerald-600 mt-1.5">{item.date}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportPanel;
