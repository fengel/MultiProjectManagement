import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Allocation, Developer, Project, Year, DeveloperSalaryEntry, ExtraPayment } from '@/lib/types';

export interface DataState {
  years: Year[];
  activeYear: Year | null;
  developers: Developer[];
  projects: Project[];
  allocations: Allocation[];
  salary_entries: DeveloperSalaryEntry[];
  extra_payments: ExtraPayment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useData(): DataState {
  const [years, setYears] = useState<Year[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [salary_entries, setSalaryEntries] = useState<DeveloperSalaryEntry[]>([]);
  const [extra_payments, setExtraPayments] = useState<ExtraPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await api.getData();
      setYears(payload.years as Year[]);
      setDevelopers(payload.developers as Developer[]);
      setProjects(payload.projects as Project[]);
      setAllocations(payload.allocations as Allocation[]);
      setSalaryEntries(payload.salary_entries as DeveloperSalaryEntry[]);
      setExtraPayments(payload.extra_payments as ExtraPayment[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeYear = years.find((y) => y.is_active) ?? years[0] ?? null;

  return {
    years,
    activeYear,
    developers,
    projects,
    allocations,
    salary_entries,
    extra_payments,
    loading,
    error,
    refresh,
  };
}
