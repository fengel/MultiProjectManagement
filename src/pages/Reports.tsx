import { useMemo, useState } from 'react';
import type { Allocation, Developer, Project, Year } from '@/lib/types';
import { MONTH_NAMES, QUARTERS } from '@/lib/types';
import {
  devMonthTotal, devQuarterlyFTE, projectMonthFTE, projectTotalPT,
  projectTotalBudget, projectWeightedRate,
} from '@/lib/calc';
import { fmtEUR, fmtNum, fmtFTE, fmtPct } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Download, User, FolderKanban } from 'lucide-react';

interface ReportsProps {
  year: Year;
  developers: Developer[];
  projects: Project[];
  allocations: Allocation[];
}

type View = 'developer' | 'project';

export function Reports({ year, developers, projects, allocations }: ReportsProps) {
  const [view, setView] = useState<View>('developer');

  return (
    <div>
      <PageHeader
        title="Auswertung"
        subtitle="Reports & analytics"
        actions={
          <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
            <button
              onClick={() => setView('developer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium ${
                view === 'developer' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <User className="h-4 w-4" /> Developer View
            </button>
            <button
              onClick={() => setView('project')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium ${
                view === 'project' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FolderKanban className="h-4 w-4" /> Project View
            </button>
          </div>
        }
      />

      {view === 'developer' ? (
        <DeveloperView year={year} developers={developers} allocations={allocations} />
      ) : (
        <ProjectView year={year} projects={projects} developers={developers} allocations={allocations} />
      )}
    </div>
  );
}

/* ---------- Developer View ---------- */
function DeveloperView({
  year, developers, allocations,
}: {
  year: Year;
  developers: Developer[];
  allocations: Allocation[];
}) {
  const rows = useMemo(
    () =>
      developers.map((d) => {
        const monthly = MONTH_NAMES.map((_, i) => devMonthTotal(allocations, d.id, year.id, i + 1));
        const quarterly = devQuarterlyFTE(allocations, d.id, year.id);
        const yearTotal = monthly.reduce((s, v) => s + v, 0);
        const cap = Number(d.target_fte) * 12;
        const util = cap > 0 ? yearTotal / cap : 0;
        return { dev: d, monthly, quarterly, yearTotal, util };
      }),
    [developers, allocations, year.id]
  );

  const exportCSV = () => {
    const header = ['Developer', 'Role', ...MONTH_NAMES, 'Q1', 'Q2', 'Q3', 'Q4', 'Year FTE', 'Capacity FTE', 'Utilization %'];
    const lines = rows.map((r) =>
      [
        r.dev.name, r.dev.role,
        ...r.monthly.map((v) => v.toFixed(2)),
        ...r.quarterly.map((v) => v.toFixed(2)),
        r.yearTotal.toFixed(2), (Number(r.dev.target_fte) * 12).toFixed(2),
        (r.util * 100).toFixed(1),
      ].join(',')
    );
    downloadCSV(`developer-report-${year.year}.csv`, [header.join(','), ...lines].join('\n'));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Developer Utilization — {year.year}</h3>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600">
              <th className="sticky left-0 z-10 bg-slate-50 px-5 py-3 text-left font-medium">Developer</th>
              {MONTH_NAMES.map((m) => (
                <th key={m} className="px-2 py-3 text-right font-medium">{m}</th>
              ))}
              {QUARTERS.map((q) => (
                <th key={q.label} className="px-2 py-3 text-right font-medium">{q.label}</th>
              ))}
              <th className="px-2 py-3 text-right font-medium">Year</th>
              <th className="px-2 py-3 text-right font-medium">Util</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.dev.id} className="hover:bg-slate-50/50">
                <td className="sticky left-0 z-10 bg-white px-5 py-2.5">
                  <div className="font-medium text-slate-800">{r.dev.name}</div>
                  <div className="text-xs text-slate-400">{r.dev.role}</div>
                </td>
                {r.monthly.map((v, i) => (
                  <td key={i} className={`px-2 py-2.5 text-right ${v > 1 ? 'text-red-600 font-medium' : v > 0 ? 'text-slate-600' : 'text-slate-300'}`}>
                    {v.toFixed(2)}
                  </td>
                ))}
                {r.quarterly.map((v, i) => (
                  <td key={i} className="px-2 py-2.5 text-right text-slate-700 font-medium">{v.toFixed(2)}</td>
                ))}
                <td className="px-2 py-2.5 text-right font-semibold text-slate-800">{r.yearTotal.toFixed(2)}</td>
                <td className="px-2 py-2.5 text-right">
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${
                    r.util > 1 ? 'bg-red-100 text-red-700' :
                    r.util < 0.8 ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {fmtPct(r.util)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 text-xs text-slate-400">
        Values are FTE (full-time equivalent) per month. Quarterly columns sum 3 months. Utilization = Year FTE / (Target FTE × 12).
      </div>
    </div>
  );
}

/* ---------- Project View ---------- */
function ProjectView({
  year, projects, developers, allocations,
}: {
  year: Year;
  projects: Project[];
  developers: Developer[];
  allocations: Allocation[];
}) {
  const rows = useMemo(
    () =>
      projects.map((p) => {
        const monthly = MONTH_NAMES.map((_, i) => projectMonthFTE(allocations, p.id, year.id, i + 1));
        const totalFTE = monthly.reduce((s, v) => s + v, 0);
        const totalPT = projectTotalPT(allocations, p.id, year.id, year.working_days_per_month);
        const rate = projectWeightedRate(allocations, p.id, year.id, developers);
        const budget = projectTotalBudget(allocations, p.id, year, developers);
        return { proj: p, monthly, totalFTE, totalPT, rate, budget };
      }),
    [projects, allocations, year, developers]
  );

  const exportCSV = () => {
    const header = ['Code', 'Name', 'Status', ...MONTH_NAMES, 'Total FTE', 'Total PT', 'Weighted Rate (EUR/h)', 'Total Budget (EUR)'];
    const lines = rows.map((r) =>
      [
        r.proj.code, `"${r.proj.name}"`, r.proj.status,
        ...r.monthly.map((v) => v.toFixed(2)),
        r.totalFTE.toFixed(2), r.totalPT.toFixed(1),
        r.rate.toFixed(2), r.budget.toFixed(2),
      ].join(',')
    );
    downloadCSV(`project-report-${year.year}.csv`, [header.join(','), ...lines].join('\n'));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Project Budget & Effort — {year.year}</h3>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600">
              <th className="sticky left-0 z-10 bg-slate-50 px-5 py-3 text-left font-medium">Project</th>
              {MONTH_NAMES.map((m) => (
                <th key={m} className="px-2 py-3 text-right font-medium">{m}</th>
              ))}
              <th className="px-2 py-3 text-right font-medium">FTE</th>
              <th className="px-2 py-3 text-right font-medium">PT</th>
              <th className="px-2 py-3 text-right font-medium">Rate</th>
              <th className="px-2 py-3 text-right font-medium">Budget</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.proj.id} className="hover:bg-slate-50/50">
                <td className="sticky left-0 z-10 bg-white px-5 py-2.5">
                  <div className="font-mono font-medium text-slate-800">{r.proj.code}</div>
                  <div className="text-xs text-slate-400 truncate max-w-[160px]">{r.proj.name}</div>
                </td>
                {r.monthly.map((v, i) => (
                  <td key={i} className={`px-2 py-2.5 text-right ${v > 0 ? 'text-slate-600' : 'text-slate-300'}`}>
                    {v.toFixed(2)}
                  </td>
                ))}
                <td className="px-2 py-2.5 text-right font-semibold text-slate-800">{r.totalFTE.toFixed(2)}</td>
                <td className="px-2 py-2.5 text-right text-slate-700">{fmtNum(r.totalPT, 1)}</td>
                <td className="px-2 py-2.5 text-right text-slate-600">{fmtEUR(r.rate)}</td>
                <td className="px-2 py-2.5 text-right font-semibold text-slate-900">{fmtEUR(r.budget)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-semibold text-slate-800 border-t-2 border-slate-200">
              <td className="sticky left-0 z-10 bg-slate-50 px-5 py-3">Total</td>
              {MONTH_NAMES.map((_, i) => (
                <td key={i} className="px-2 py-3 text-right text-slate-600">
                  {rows.reduce((s, r) => s + r.monthly[i], 0).toFixed(2)}
                </td>
              ))}
              <td className="px-2 py-3 text-right">{rows.reduce((s, r) => s + r.totalFTE, 0).toFixed(2)}</td>
              <td className="px-2 py-3 text-right">{fmtNum(rows.reduce((s, r) => s + r.totalPT, 0), 1)}</td>
              <td className="px-2 py-3 text-right">—</td>
              <td className="px-2 py-3 text-right">{fmtEUR(rows.reduce((s, r) => s + r.budget, 0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="px-5 py-3 text-xs text-slate-400">
        Budget = Monthly FTE × weighted monthly rate. Weighted rate = average of assigned developers' rates weighted by allocation.
      </div>
    </div>
  );
}

/* ---------- CSV helper ---------- */
function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
