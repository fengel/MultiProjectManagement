import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
      const [yRes, dRes, pRes, aRes] = await Promise.all([
        supabase.from('years').select('*').order('year', { ascending: true }),
        supabase.from('developers').select('*').order('sort_order', { ascending: true }),
        supabase.from('projects').select('*').order('sort_order', { ascending: true }),
        supabase.from('allocations').select('*'),
      ]);

      if (yRes.error) throw yRes.error;
      if (dRes.error) throw dRes.error;
      if (pRes.error) throw pRes.error;
      if (aRes.error) throw aRes.error;

      setYears(yRes.data as Year[]);
      setDevelopers(dRes.data as Developer[]);
      setProjects(pRes.data as Project[]);
      setAllocations(aRes.data as Allocation[]);
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
