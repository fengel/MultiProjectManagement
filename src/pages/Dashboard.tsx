import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import {
  CalendarDays, Users, FolderKanban, Wallet, Clock, Euro,
  TrendingUp, AlertTriangle,
} from 'lucide-react';
import type { Allocation, Developer, Project, Year } from '@/lib/types';
import {
  totalBudget, totalPlannedPT, avgMonthlyRate, quarterlyStats, fullYearStat,
  monthlyCapacityVsPlanned, projectTotalPT,
} from '@/lib/calc';
import { fmtEUR, fmtNum, fmtPct, fmtFTE } from '@/lib/format';
import { MONTH_NAMES } from '@/lib/types';

interface DashboardProps {
  year: Year;
  developers: Developer[];
  projects: Project[];
  allocations: Allocation[];
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: typeof CalendarDays;
  accent: string;
}

function KpiCard({ label, value, sub, icon: Icon, accent }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1.5">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function utilClass(u: number): string {
  if (u > 1) return 'bg-red-100 text-red-700';
  if (u < 0.8) return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

export function Dashboard({ year, developers, projects, allocations }: DashboardProps) {
  const budget = useMemo(
    () => totalBudget(allocations, projects, year, developers),
    [allocations, projects, year, developers]
  );
  const plannedPT = useMemo(
    () => totalPlannedPT(allocations, year.id, year.working_days_per_month),
    [allocations, year]
  );
  const avgRate = useMemo(() => avgMonthlyRate(developers), [developers]);
  const qStats = useMemo(
    () => quarterlyStats(allocations, developers, year.id),
    [allocations, developers, year.id]
  );
  const yearStat = useMemo(
    () => fullYearStat(allocations, developers, year.id),
    [allocations, developers, year.id]
  );
  const monthlyData = useMemo(
    () => monthlyCapacityVsPlanned(allocations, developers, year.id),
    [allocations, developers, year.id]
  );
  const projectPTData = useMemo(
    () =>
      projects
        .map((p) => ({
          name: p.code,
          fullName: p.name,
          pt: projectTotalPT(allocations, p.id, year.id, year.working_days_per_month),
        }))
        .filter((d) => d.pt > 0)
        .sort((a, b) => b.pt - a.pt),
    [projects, allocations, year]
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Active Year" value={String(year.year)} icon={CalendarDays} accent="bg-indigo-50 text-indigo-600" />
        <KpiCard label="Developers" value={String(developers.length)} icon={Users} accent="bg-blue-50 text-blue-600" />
        <KpiCard label="Projects" value={String(projects.length)} icon={FolderKanban} accent="bg-cyan-50 text-cyan-600" />
        <KpiCard label="Total Budget" value={fmtEUR(budget)} icon={Wallet} accent="bg-emerald-50 text-emerald-600" />
        <KpiCard label="Planned PT" value={fmtNum(plannedPT, 0)} sub="Person-days" icon={Clock} accent="bg-amber-50 text-amber-600" />
        <KpiCard label="Avg Rate" value={fmtEUR(avgRate)} sub="per hour" icon={Euro} accent="bg-violet-50 text-violet-600" />
      </div>

      {/* Quarterly Overview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            Quarterly Utilization Overview — {year.year}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="px-5 py-3 text-left font-medium">Metric</th>
                <th className="px-5 py-3 text-right font-medium">Q1</th>
                <th className="px-5 py-3 text-right font-medium">Q2</th>
                <th className="px-5 py-3 text-right font-medium">Q3</th>
                <th className="px-5 py-3 text-right font-medium">Q4</th>
                <th className="px-5 py-3 text-right font-medium">Full Year</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-5 py-3 font-medium text-slate-700">Capacity (FTE)</td>
                {qStats.map((q) => (
                  <td key={q.label} className="px-5 py-3 text-right text-slate-600">{fmtFTE(q.capacity)}</td>
                ))}
                <td className="px-5 py-3 text-right font-semibold text-slate-800">{fmtFTE(yearStat.capacity)}</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-medium text-slate-700">Planned (FTE)</td>
                {qStats.map((q) => (
                  <td key={q.label} className="px-5 py-3 text-right text-slate-600">{fmtFTE(q.planned)}</td>
                ))}
                <td className="px-5 py-3 text-right font-semibold text-slate-800">{fmtFTE(yearStat.planned)}</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-medium text-slate-700">Utilization</td>
                {qStats.map((q) => (
                  <td key={q.label} className="px-5 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${utilClass(q.utilization)}`}>
                      {q.utilization > 1 && <AlertTriangle className="h-3 w-3" />}
                      {fmtPct(q.utilization)}
                    </span>
                  </td>
                ))}
                <td className="px-5 py-3 text-right">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${utilClass(yearStat.utilization)}`}>
                    {yearStat.utilization > 1 && <AlertTriangle className="h-3 w-3" />}
                    {fmtPct(yearStat.utilization)}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Person-Days (PT) per Project</h3>
          {projectPTData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No allocations yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectPTData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip
                  formatter={(v) => [`${fmtNum(Number(v), 1)} PT`, 'Person-Days']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="pt" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Monthly Capacity vs Planned FTE</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip
                formatter={(v) => fmtFTE(Number(v))}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="capacity" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Capacity" dot={false} />
              <Line type="monotone" dataKey="planned" stroke="#6366f1" strokeWidth={2.5} name="Planned" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
