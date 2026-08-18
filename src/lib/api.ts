type ApiResponse<T> = T;

const jsonHeaders = {
  'Content-Type': 'application/json',
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...jsonHeaders,
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Request failed');
  }

  return response.json() as Promise<T>;
}

export const api = {
  getData: () => request<{ years: unknown[]; developers: unknown[]; projects: unknown[]; allocations: unknown[] }>('/data'),
  upsertDeveloper: (developer: any) => request('/developers', {
    method: 'POST',
    body: JSON.stringify(developer),
  }),
  deleteDeveloper: (id: string) => request(`/developers/${id}`, { method: 'DELETE' }),
  upsertProject: (project: any) => request('/projects', {
    method: 'POST',
    body: JSON.stringify(project),
  }),
  deleteProject: (id: string) => request(`/projects/${id}`, { method: 'DELETE' }),
  createYear: (payload: { year: number; workingDaysPerMonth?: number }) => request('/years', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  setActiveYear: (yearId: string) => request('/years/active', {
    method: 'POST',
    body: JSON.stringify({ yearId }),
  }),
  updateWorkingDays: (payload: { yearId: string; workingDaysPerMonth: number }) => request('/years/working-days', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  upsertAllocation: (allocation: any) => request('/allocations', {
    method: 'POST',
    body: JSON.stringify(allocation),
  }),
  deleteAllocation: (id: string) => request(`/allocations/${id}`, { method: 'DELETE' }),
};
