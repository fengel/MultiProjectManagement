import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Developer, Project, Year } from '@/lib/types';
import { fmtEUR2 } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Plus, Pencil, Trash2, X, Check, CalendarPlus } from 'lucide-react';

interface MasterDataProps {
  years: Year[];
  activeYear: Year | null;
  developers: Developer[];
  projects: Project[];
  refresh: () => Promise<void>;
}

type ModalType = 'dev' | 'project' | null;

export function MasterData({ years, activeYear, developers, projects, refresh }: MasterDataProps) {
  const [modal, setModal] = useState<ModalType>(null);
  const [editingDev, setEditingDev] = useState<Developer | null>(null);
  const [editingProj, setEditingProj] = useState<Project | null>(null);
  const [workingDays, setWorkingDays] = useState(activeYear?.working_days_per_month ?? 20);
  const [newYearName, setNewYearName] = useState('');
  const [savingYear, setSavingYear] = useState(false);

  useEffect(() => {
    setWorkingDays(activeYear?.working_days_per_month ?? 20);
  }, [activeYear]);

  const saveWorkingDays = async () => {
    if (!activeYear) return;
    const { error } = await supabase
      .from('years')
      .update({ working_days_per_month: workingDays })
      .eq('id', activeYear.id);
    if (error) {
      alert('Failed to update working days: ' + error.message);
      return;
    }
    await refresh();
  };

  const setActiveYear = async (yearId: string) => {
    const { error: e1 } = await supabase.from('years').update({ is_active: false }).neq('id', yearId);
    if (e1) { alert(e1.message); return; }
    const { error: e2 } = await supabase.from('years').update({ is_active: true }).eq('id', yearId);
    if (e2) { alert(e2.message); return; }
    await refresh();
  };

  const createYear = async () => {
    const y = parseInt(newYearName, 10);
    if (!y || y < 2000 || y > 2100) { alert('Enter a valid year (e.g. 2027)'); return; }
    if (years.some((x) => x.year === y)) { alert('Year already exists'); return; }
    setSavingYear(true);
    // Set all existing years inactive, then insert new year as active.
    await supabase.from('years').update({ is_active: false }).neq('year', y);
    const { error } = await supabase.from('years').insert({ year: y, working_days_per_month: 20, is_active: true });
    setSavingYear(false);
    if (error) { alert(error.message); return; }
    setNewYearName('');
    await refresh();
  };

  const deleteDeveloper = async (dev: Developer) => {
    if (!confirm(`Delete developer "${dev.name}"? This also removes all their allocations.`)) return;
    const { error } = await supabase.from('developers').delete().eq('id', dev.id);
    if (error) { alert(error.message); return; }
    await refresh();
  };

  const deleteProject = async (proj: Project) => {
    if (!confirm(`Delete project "${proj.code} — ${proj.name}"? This also removes its allocations.`)) return;
    const { error } = await supabase.from('projects').delete().eq('id', proj.id);
    if (error) { alert(error.message); return; }
    await refresh();
  };

  return (
    <div>
      <PageHeader title="Stammdaten" subtitle="Master data & global settings" />

      {/* Year & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Planning Year</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Active Year</label>
              <div className="flex flex-wrap gap-2">
                {years.map((y) => (
                  <button
                    key={y.id}
                    onClick={() => setActiveYear(y.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      y.is_active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {y.year}
                    {y.is_active && <span className="ml-1.5 text-indigo-200">●</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Create New Year</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  placeholder="e.g. 2027"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <button
                  onClick={createYear}
                  disabled={savingYear}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  <CalendarPlus className="h-4 w-4" /> Create
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">New years start with default working days (20/month) and no allocations.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Global Settings</h3>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Average Working Days per Month
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={31}
                value={workingDays}
                onChange={(e) => setWorkingDays(parseInt(e.target.value) || 0)}
                className="w-28 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
              <span className="text-sm text-slate-500">days</span>
              <button
                onClick={saveWorkingDays}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
              >
                <Check className="h-4 w-4" /> Save
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Applies to {activeYear?.year}. Used for all person-day and budget calculations.
            </p>
          </div>
        </div>
      </div>

      {/* Developers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Developers ({developers.length})</h3>
          <button
            onClick={() => { setEditingDev(null); setModal('dev'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Add Developer
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="px-5 py-3 text-left font-medium">Name</th>
                <th className="px-5 py-3 text-left font-medium">Role / Specialization</th>
                <th className="px-5 py-3 text-right font-medium">Monthly Rate</th>
                <th className="px-5 py-3 text-right font-medium">Target FTE</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {developers.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{d.name}</td>
                  <td className="px-5 py-3 text-slate-600">{d.role}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{fmtEUR2(Number(d.monthly_rate))}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{(Number(d.target_fte) * 100).toFixed(0)}%</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditingDev(d); setModal('dev'); }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteDeveloper(d)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Projects ({projects.length})</h3>
          <button
            onClick={() => { setEditingProj(null); setModal('project'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Add Project
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="px-5 py-3 text-left font-medium">Code</th>
                <th className="px-5 py-3 text-left font-medium">Name</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono font-medium text-slate-800">{p.code}</td>
                  <td className="px-5 py-3 text-slate-600">{p.name}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                      p.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditingProj(p); setModal('project'); }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteProject(p)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'dev' && (
        <DeveloperModal
          developer={editingDev}
          sortOrder={developers.length}
          onClose={() => setModal(null)}
          onSaved={async () => { setModal(null); await refresh(); }}
        />
      )}
      {modal === 'project' && (
        <ProjectModal
          project={editingProj}
          sortOrder={projects.length}
          onClose={() => setModal(null)}
          onSaved={async () => { setModal(null); await refresh(); }}
        />
      )}
    </div>
  );
}

/* ---------- Developer Modal ---------- */
function DeveloperModal({
  developer, sortOrder, onClose, onSaved,
}: {
  developer: Developer | null;
  sortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(developer?.name ?? '');
  const [role, setRole] = useState(developer?.role ?? '');
  const [rate, setRate] = useState(developer ? Number(developer.monthly_rate) : 1700);
  const [fte, setFte] = useState(developer ? Number(developer.target_fte) : 1);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !role.trim()) { alert('Name and role are required'); return; }
    if (rate < 0 || fte < 0 || fte > 2) { alert('Invalid rate or FTE'); return; }
    setSaving(true);
    if (developer) {
      const { error } = await supabase.from('developers').update({
        name: name.trim(), role: role.trim(), monthly_rate: rate, target_fte: fte,
      }).eq('id', developer.id);
      setSaving(false);
      if (error) { alert(error.message); return; }
    } else {
      const { error } = await supabase.from('developers').insert({
        name: name.trim(), role: role.trim(), monthly_rate: rate, target_fte: fte, sort_order: sortOrder + 1,
      });
      setSaving(false);
      if (error) { alert(error.message); return; }
    }
    onSaved();
  };

  return (
    <ModalShell title={developer ? 'Edit Developer' : 'Add Developer'} onClose={onClose}>
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="modal-input" placeholder="e.g. Anna Schmidt" />
      </Field>
      <Field label="Role / Specialization">
        <input value={role} onChange={(e) => setRole(e.target.value)}
          className="modal-input" placeholder="e.g. Frontend Engineer" />
      </Field>
      <Field label="Monthly Rate (€/month)">
        <input type="number" min={0} step={50} value={rate} onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
          className="modal-input" />
      </Field>
      <Field label="Target FTE (0–2)">
        <input type="number" min={0} max={2} step={0.05} value={fte} onChange={(e) => setFte(parseFloat(e.target.value) || 0)}
          className="modal-input" />
      </Field>
      <ModalActions onSave={save} onCancel={onClose} saving={saving} />
    </ModalShell>
  );
}

/* ---------- Project Modal ---------- */
function ProjectModal({
  project, sortOrder, onClose, onSaved,
}: {
  project: Project | null;
  sortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(project?.code ?? '');
  const [name, setName] = useState(project?.name ?? '');
  const [status, setStatus] = useState<'Active' | 'Planning'>(project?.status ?? 'Active');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!code.trim() || !name.trim()) { alert('Code and name are required'); return; }
    setSaving(true);
    if (project) {
      const { error } = await supabase.from('projects').update({
        code: code.trim(), name: name.trim(), status,
      }).eq('id', project.id);
      setSaving(false);
      if (error) { alert(error.message); return; }
    } else {
      const { error } = await supabase.from('projects').insert({
        code: code.trim(), name: name.trim(), status, sort_order: sortOrder + 1,
      });
      setSaving(false);
      if (error) { alert(error.message); return; }
    }
    onSaved();
  };

  return (
    <ModalShell title={project ? 'Edit Project' : 'Add Project'} onClose={onClose}>
      <Field label="Project Code">
        <input value={code} onChange={(e) => setCode(e.target.value)}
          className="modal-input" placeholder="e.g. PRJ-13" />
      </Field>
      <Field label="Project Name">
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="modal-input" placeholder="e.g. New CRM System" />
      </Field>
      <Field label="Status">
        <select value={status} onChange={(e) => setStatus(e.target.value as 'Active' | 'Planning')}
          className="modal-input">
          <option value="Active">Active</option>
          <option value="Planning">Planning</option>
        </select>
      </Field>
      <ModalActions onSave={save} onCancel={onClose} saving={saving} />
    </ModalShell>
  );
}

/* ---------- Shared Modal Bits ---------- */
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
        Cancel
      </button>
      <button onClick={onSave} disabled={saving}
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}
