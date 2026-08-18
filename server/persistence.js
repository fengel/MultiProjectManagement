import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultState = {
  years: [
    { id: 'seed-year-2026', year: 2026, working_days_per_month: 20, is_active: true },
  ],
  developers: [
    { id: 'seed-dev-1', name: 'Anna Schmidt', role: 'Frontend Engineer', monthly_rate: 14720, target_fte: 1, sort_order: 1 },
    { id: 'seed-dev-2', name: 'Ben Müller', role: 'Backend Engineer', monthly_rate: 15200, target_fte: 1, sort_order: 2 },
  ],
  projects: [
    { id: 'seed-proj-1', code: 'PRJ-01', name: 'Customer Portal Redesign', status: 'Active', sort_order: 1 },
    { id: 'seed-proj-2', code: 'PRJ-02', name: 'Payment Gateway Integration', status: 'Active', sort_order: 2 },
  ],
  allocations: [],
};

function getFilePath(targetPath) {
  if (targetPath) return targetPath;
  return path.join(__dirname, 'data', 'app-data.json');
}

async function ensureStoreFile(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultState, null, 2), 'utf8');
  }
}

async function readStore(filePath) {
  await ensureStoreFile(filePath);
  const raw = await fs.readFile(filePath, 'utf8');

  try {
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      years: Array.isArray(parsed.years) ? parsed.years : defaultState.years,
      developers: Array.isArray(parsed.developers) ? parsed.developers : defaultState.developers,
      projects: Array.isArray(parsed.projects) ? parsed.projects : defaultState.projects,
      allocations: Array.isArray(parsed.allocations) ? parsed.allocations : defaultState.allocations,
    };
  } catch {
    return { ...defaultState };
  }
}

async function writeStore(filePath, state) {
  await ensureStoreFile(filePath);
  await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf8');
}

export function createDataStore(targetPath) {
  const filePath = getFilePath(targetPath);

  return {
    async getYears() {
      const state = await readStore(filePath);
      return state.years;
    },

    async getDevelopers() {
      const state = await readStore(filePath);
      return [...state.developers].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
    },

    async getProjects() {
      const state = await readStore(filePath);
      return [...state.projects].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
    },

    async getAllocations() {
      const state = await readStore(filePath);
      return state.allocations;
    },

    async saveDeveloper(developer) {
      const state = await readStore(filePath);
      const nextRecord = {
        id: developer.id ?? `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: developer.name,
        role: developer.role,
        monthly_rate: Number(developer.monthly_rate ?? 0),
        target_fte: Number(developer.target_fte ?? 0),
        sort_order: Number(developer.sort_order ?? 0),
      };

      const index = state.developers.findIndex((item) => item.id === developer.id);
      if (index >= 0) {
        state.developers[index] = { ...state.developers[index], ...nextRecord };
      } else {
        state.developers.push(nextRecord);
      }

      await writeStore(filePath, state);
      return nextRecord;
    },

    async saveProject(project) {
      const state = await readStore(filePath);
      const nextRecord = {
        id: project.id ?? `proj-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        code: project.code,
        name: project.name,
        status: project.status ?? 'Active',
        sort_order: Number(project.sort_order ?? 0),
      };

      const index = state.projects.findIndex((item) => item.id === project.id);
      if (index >= 0) {
        state.projects[index] = { ...state.projects[index], ...nextRecord };
      } else {
        state.projects.push(nextRecord);
      }

      await writeStore(filePath, state);
      return nextRecord;
    },

    async upsertAllocation(allocation) {
      const state = await readStore(filePath);
      const nextRecord = {
        id: allocation.id ?? `alloc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        developer_id: allocation.developer_id,
        project_id: allocation.project_id,
        year_id: allocation.year_id,
        month: Number(allocation.month ?? 1),
        allocation_pct: Number(allocation.allocation_pct ?? 0),
      };

      const index = state.allocations.findIndex((item) => item.id === allocation.id || (
        item.developer_id === nextRecord.developer_id &&
        item.project_id === nextRecord.project_id &&
        item.year_id === nextRecord.year_id &&
        item.month === nextRecord.month
      ));

      if (index >= 0) {
        state.allocations[index] = { ...state.allocations[index], ...nextRecord };
      } else {
        state.allocations.push(nextRecord);
      }

      await writeStore(filePath, state);
      return nextRecord;
    },

    async deleteAllocation(id) {
      const state = await readStore(filePath);
      state.allocations = state.allocations.filter((item) => item.id !== id);
      await writeStore(filePath, state);
    },

    async deleteDeveloper(id) {
      const state = await readStore(filePath);
      state.developers = state.developers.filter((item) => item.id !== id);
      state.allocations = state.allocations.filter((item) => item.developer_id !== id);
      await writeStore(filePath, state);
    },

    async deleteProject(id) {
      const state = await readStore(filePath);
      state.projects = state.projects.filter((item) => item.id !== id);
      state.allocations = state.allocations.filter((item) => item.project_id !== id);
      await writeStore(filePath, state);
    },

    async setActiveYear(yearId) {
      const state = await readStore(filePath);
      state.years = state.years.map((year) => ({
        ...year,
        is_active: year.id === yearId,
      }));
      await writeStore(filePath, state);
    },

    async createYear(year, workingDaysPerMonth = 20) {
      const state = await readStore(filePath);
      const existing = state.years.find((item) => item.year === Number(year));
      if (existing) return existing;

      const nextYear = {
        id: `year-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        year: Number(year),
        working_days_per_month: Number(workingDaysPerMonth),
        is_active: state.years.length === 0,
      };

      state.years.push(nextYear);
      await writeStore(filePath, state);
      return nextYear;
    },

    async saveWorkingDays(yearId, workingDaysPerMonth) {
      const state = await readStore(filePath);
      const year = state.years.find((item) => item.id === yearId);
      if (!year) return null;

      year.working_days_per_month = Number(workingDaysPerMonth);
      await writeStore(filePath, state);
      return year;
    },
  };
}
