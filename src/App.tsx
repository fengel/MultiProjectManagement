import { useState } from 'react';
import { Sidebar, type Page } from '@/components/Sidebar';
import { useData } from '@/hooks/useData';
import { Dashboard } from '@/pages/Dashboard';
import { MasterData } from '@/pages/MasterData';
import { AllocationPage } from '@/pages/AllocationPage';
import { Reports } from '@/pages/Reports';
import { AlertCircle, Loader2 } from 'lucide-react';

function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const data = useData();

  const activeYearLabel = data.activeYear ? String(data.activeYear.year) : '—';

  if (data.loading && data.developers.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading resource data…</span>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-red-200 p-6 max-w-md text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="font-semibold text-slate-900 mb-1">Failed to load data</h2>
          <p className="text-sm text-slate-500">{data.error}</p>
          <button
            onClick={() => void data.refresh()}
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar page={page} setPage={setPage} activeYearLabel={activeYearLabel} />
      <main className="lg:ml-72 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 max-w-[1600px] mx-auto">
          {!data.activeYear ? (
            <div className="bg-white rounded-xl border border-amber-200 p-6 text-center">
              <p className="text-slate-600">No planning year found. Create one in the Stammdaten page.</p>
              <button onClick={() => setPage('master')} className="mt-3 text-indigo-600 font-medium text-sm">Go to Stammdaten →</button>
            </div>
          ) : page === 'dashboard' ? (
            <Dashboard
              year={data.activeYear}
              developers={data.developers}
              projects={data.projects}
              allocations={data.allocations}
              salary_entries={data.salary_entries}
              extra_payments={data.extra_payments}
            />
          ) : page === 'master' ? (
            <MasterData
              years={data.years}
              activeYear={data.activeYear}
              developers={data.developers}
              projects={data.projects}
              salary_entries={data.salary_entries}
              extra_payments={data.extra_payments}
              refresh={data.refresh}
            />
          ) : page === 'allocation' ? (
            <AllocationPage
              year={data.activeYear}
              developers={data.developers}
              projects={data.projects}
              allocations={data.allocations}
              refresh={data.refresh}
            />
          ) : (
            <Reports
              year={data.activeYear}
              developers={data.developers}
              projects={data.projects}
              allocations={data.allocations}
              salary_entries={data.salary_entries}
              extra_payments={data.extra_payments}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
