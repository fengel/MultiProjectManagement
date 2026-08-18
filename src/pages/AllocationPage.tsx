import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Allocation, Developer, Project, Year } from '@/lib/types';
import { MONTH_NAMES, MONTH_NAMES_FULL } from '@/lib/types';
import { devMonthTotal } from '@/lib/calc';
import { PageHeader } from '@/components/PageHeader';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AllocationPageProps {
  year: Year;
  developers: Developer[];
  projects: Project[];
  allocations: Allocation[];
  refresh: () => Promise<void>;
}

export function AllocationPage({ year, developers, projects, allocations, refresh }: AllocationPageProps) {
  const [month, setMonth] = useState(0); // 0-indexed

  const allocMap = useMemo(() => {
    const m = new Map<string, Allocation>();
    for (const a of allocations) {
      if (a.year_id === year.id && a.month === month + 1) {
        m.set(`${a.developer_id}|${a.project_id}`, a);
      }
    }
    return m;
  }, [allocations, year.id, month]);

  const handleChange = async (
    devId: string,
    projId: string,
    raw: string
  ) => {
    // Accept "20" or "0.2" or "20%"
    let val = parseFloat(raw.replace('%', ''));
    if (isNaN(val)) val = 0;
    if (val > 1) val = val / 100; // treat >1 as percentage
    val = Math.max(0, Math.min(1, val));

    const existing = allocMap.get(`${devId}|${projId}`);
    if (existing) {
      if (val === 0) {
        await api.deleteAllocation(existing.id);
      } else {
        await api.upsertAllocation({
          id: existing.id,
          developer_id: devId,
          project_id: projId,
          year_id: year.id,
          month: month + 1,
          allocation_pct: val,
        });
      }
    } else {
      if (val > 0) {
        await api.upsertAllocation({
          developer_id: devId,
          project_id: projId,
          year_id: year.id,
          month: month + 1,
          allocation_pct: val,
        });
      }
    }
    await refresh();
  };

  return (
    <div>
      <PageHeader
        title="Allokation"
        subtitle="Monthly resource allocation matrix"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth((m) => (m + 11) % 12)}
              className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium min-w-[140px] text-center">
              {MONTH_NAMES_FULL[month]} {year.year}
            </span>
            <button
              onClick={() => setMonth((m) => (m + 1) % 12)}
              className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left font-medium text-slate-600 min-w-[180px]">
                  Developer
                </th>
                {projects.map((p) => (
                  <th key={p.id} className="px-3 py-3 text-center font-medium text-slate-600 min-w-[90px]">
                    <div className="font-mono text-xs">{p.code}</div>
                    <div className="text-[10px] text-slate-400 font-normal truncate max-w-[100px]">{p.name}</div>
                  </th>
                ))}
                <th className="px-3 py-3 text-right font-medium text-slate-600 sticky right-0 z-10 bg-slate-50 min-w-[100px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {developers.map((d) => {
                const total = devMonthTotal(allocations, d.id, year.id, month + 1);
                const totalClass =
                  total > 1 ? 'bg-red-100 text-red-700' :
                  total < 0.8 && total > 0 ? 'bg-amber-100 text-amber-700' :
                  total === 0 ? 'bg-slate-50 text-slate-400' :
                  'bg-emerald-100 text-emerald-700';
                return (
                  <tr key={d.id} className="hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 px-4 py-2 bg-white">
                      <div className="font-medium text-slate-800">{d.name}</div>
                      <div className="text-xs text-slate-400">{d.role}</div>
                    </td>
                    {projects.map((p) => {
                      const a = allocMap.get(`${d.id}|${p.id}`);
                      const pct = a ? Number(a.allocation_pct) : 0;
                      return (
                        <td key={p.id} className="px-1 py-1 text-center">
                          <input
                            type="text"
                            defaultValue={pct > 0 ? String(Math.round(pct * 100)) : ''}
                            key={`${d.id}|${p.id}|${month}|${pct}`}
                            onBlur={(e) => handleChange(d.id, p.id, e.target.value)}
                            placeholder="—"
                            className={`w-16 px-2 py-1.5 text-center text-sm rounded border outline-none transition-colors ${
                              pct > 0
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 focus:border-indigo-500 focus:bg-white'
                                : 'border-slate-200 text-slate-600 focus:border-indigo-500 focus:bg-white'
                            }`}
                          />
                        </td>
                      );
                    })}
                    <td className={`sticky right-0 z-10 px-3 py-2 text-right font-semibold ${totalClass}`}>
                      {Math.round(total * 100)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-200" /> Over-allocated (&gt;100%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-200" /> Under-allocated (&lt;80%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-200" /> Well-allocated (80–100%)
        </span>
        <span className="ml-auto">Tip: enter values as percentages (e.g. 30) or decimals (0.3). Tab between cells.</span>
      </div>
    </div>
  );
}
