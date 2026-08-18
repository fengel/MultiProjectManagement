import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Allocation, Developer, Project, Year } from '@/lib/types';

export interface DataState {
  years: Year[];
  activeYear: Year | null;
  developers: Developer[];
  projects: Project[];
  allocations: Allocation[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useData(): DataState {
  const [years, setYears] = useState<Year[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
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
    loading,
    error,
    refresh,
  };
}
