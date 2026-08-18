import { useState } from 'react';
import { LayoutDashboard, Database, Grid3x3, BarChart3, Menu, X, Users, Building2 } from 'lucide-react';

export type Page = 'dashboard' | 'master' | 'allocation' | 'reports';

interface NavItem {
  id: Page;
  label: string;
  sublabel: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', sublabel: 'KPIs & overview', icon: LayoutDashboard },
  { id: 'master', label: 'Stammdaten', sublabel: 'Master data & settings', icon: Database },
  { id: 'allocation', label: 'Allokation', sublabel: 'Monthly resource matrix', icon: Grid3x3 },
  { id: 'reports', label: 'Auswertung', sublabel: 'Reports & analytics', icon: BarChart3 },
];

interface SidebarProps {
  page: Page;
  setPage: (p: Page) => void;
  activeYearLabel: string;
}

export function Sidebar({ page, setPage, activeYearLabel }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (p: Page) => {
    setPage(p);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-slate-900 px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
            <Users className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">Resource Manager</span>
        </div>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="text-slate-300 hover:text-white p-1"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="hidden lg:flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/20">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">Resource Manager</h1>
            <p className="text-slate-400 text-xs">Team & Budget Planning</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                <div className="min-w-0">
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className={`text-xs truncate ${active ? 'text-indigo-100' : 'text-slate-500'}`}>
                    {item.sublabel}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800">
          <div className="rounded-lg bg-slate-800/60 px-3 py-2.5">
            <div className="text-xs text-slate-400">Active Planning Year</div>
            <div className="text-white font-semibold text-lg">{activeYearLabel}</div>
          </div>
        </div>
      </aside>
    </>
  );
}
