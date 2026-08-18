import type { Allocation, Developer, Project, Year } from '@/lib/types';
import { MONTH_NAMES, QUARTERS } from '@/lib/types';

/**
 * Returns the allocation fraction (0..1) for a dev/project/month/year.
 */
export function getAllocation(
  allocations: Allocation[],
  developerId: string,
  projectId: string,
  yearId: string,
  month: number // 1..12
): number {
  const a = allocations.find(
    (x) =>
      x.developer_id === developerId &&
      x.project_id === projectId &&
      x.year_id === yearId &&
      x.month === month
  );
  return a ? Number(a.allocation_pct) : 0;
}

/**
 * Total allocation fraction for a developer in a given month (sum across projects).
 */
export function devMonthTotal(
  allocations: Allocation[],
  developerId: string,
  yearId: string,
  month: number
): number {
  return allocations
    .filter((a) => a.developer_id === developerId && a.year_id === yearId && a.month === month)
    .reduce((sum, a) => sum + Number(a.allocation_pct), 0);
}

/**
 * Sum of FTE allocated to a project in a given month.
 */
export function projectMonthFTE(
  allocations: Allocation[],
  projectId: string,
  yearId: string,
  month: number
): number {
  return allocations
    .filter((a) => a.project_id === projectId && a.year_id === yearId && a.month === month)
    .reduce((sum, a) => sum + Number(a.allocation_pct), 0);
}

/**
 * Person-days for a project in a month = FTE * workingDays.
 */
export function projectMonthPT(
  allocations: Allocation[],
  projectId: string,
  yearId: string,
  month: number,
  workingDays: number
): number {
  return projectMonthFTE(allocations, projectId, yearId, month) * workingDays;
}

/**
 * Weighted monthly rate for a project (weighted by allocation fraction across all months/devs).
 */
export function projectWeightedRate(
  allocations: Allocation[],
  projectId: string,
  yearId: string,
  developers: Developer[]
): number {
  const devs = new Map(developers.map((d) => [d.id, d]));
  let weightedSum = 0;
  let totalWeight = 0;
  for (const a of allocations) {
    if (a.project_id !== projectId || a.year_id !== yearId) continue;
    const dev = devs.get(a.developer_id);
    if (!dev) continue;
    const w = Number(a.allocation_pct);
    weightedSum += Number(dev.monthly_rate) * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Total budget for a project across the year.
 * Budget = sum over months of (monthlyFTE * weightedMonthlyRate)
 */
export function projectTotalBudget(
  allocations: Allocation[],
  projectId: string,
  year: Year,
  developers: Developer[]
): number {
  const rate = projectWeightedRate(allocations, projectId, year.id, developers);
  let budget = 0;
  for (let m = 1; m <= 12; m++) {
    const fte = projectMonthFTE(allocations, projectId, year.id, m);
    budget += fte * rate;
  }
  return budget;
}

/**
 * Total person-days for a project across the year.
 */
export function projectTotalPT(
  allocations: Allocation[],
  projectId: string,
  yearId: string,
  workingDays: number
): number {
  let pt = 0;
  for (let m = 1; m <= 12; m++) {
    pt += projectMonthPT(allocations, projectId, yearId, m, workingDays);
  }
  return pt;
}

/**
 * Total team capacity in FTE for a month = sum of dev target_fte.
 */
export function teamMonthCapacity(developers: Developer[]): number {
  return developers.reduce((sum, d) => sum + Number(d.target_fte), 0);
}

/**
 * Total planned FTE for a month across all devs/projects.
 */
export function teamMonthPlanned(
  allocations: Allocation[],
  yearId: string,
  month: number
): number {
  return allocations
    .filter((a) => a.year_id === yearId && a.month === month)
    .reduce((sum, a) => sum + Number(a.allocation_pct), 0);
}

/**
 * Total budget across all projects for the year.
 */
export function totalBudget(
  allocations: Allocation[],
  projects: Project[],
  year: Year,
  developers: Developer[]
): number {
  return projects.reduce(
    (sum, p) => sum + projectTotalBudget(allocations, p.id, year, developers),
    0
  );
}

/**
 * Total planned person-days for the year.
 */
export function totalPlannedPT(
  allocations: Allocation[],
  yearId: string,
  workingDays: number
): number {
  let pt = 0;
  for (let m = 1; m <= 12; m++) {
    pt += teamMonthPlanned(allocations, yearId, m) * workingDays;
  }
  return pt;
}

/**
 * Average monthly rate across developers (weighted by target FTE).
 */
export function avgMonthlyRate(developers: Developer[]): number {
  if (developers.length === 0) return 0;
  const totalFTE = developers.reduce((s, d) => s + Number(d.target_fte), 0);
  if (totalFTE === 0) return 0;
  return developers.reduce((s, d) => s + Number(d.monthly_rate) * Number(d.target_fte), 0) / totalFTE;
}

export interface QuarterStat {
  label: string;
  capacity: number;
  planned: number;
  utilization: number; // 0..1+
}

export function quarterlyStats(
  allocations: Allocation[],
  developers: Developer[],
  yearId: string
): QuarterStat[] {
  const capacity = teamMonthCapacity(developers);
  return QUARTERS.map((q) => {
    let planned = 0;
    for (const mi of q.months) {
      planned += teamMonthPlanned(allocations, yearId, mi + 1);
    }
    // Quarter capacity = monthly capacity * 3 (capacity is per-month FTE)
    const qCapacity = capacity * 3;
    return {
      label: q.label,
      capacity: qCapacity,
      planned,
      utilization: qCapacity > 0 ? planned / qCapacity : 0,
    };
  });
}

export function fullYearStat(
  allocations: Allocation[],
  developers: Developer[],
  yearId: string
): QuarterStat {
  const capacity = teamMonthCapacity(developers);
  let planned = 0;
  for (let m = 1; m <= 12; m++) {
    planned += teamMonthPlanned(allocations, yearId, m);
  }
  const yCapacity = capacity * 12;
  return {
    label: 'Year',
    capacity: yCapacity,
    planned,
    utilization: yCapacity > 0 ? planned / yCapacity : 0,
  };
}

/**
 * Monthly capacity vs planned arrays for charts.
 */
export function monthlyCapacityVsPlanned(
  allocations: Allocation[],
  developers: Developer[],
  yearId: string
): { month: string; capacity: number; planned: number }[] {
  const capacity = teamMonthCapacity(developers);
  return MONTH_NAMES.map((m, i) => ({
    month: m,
    capacity,
    planned: teamMonthPlanned(allocations, yearId, i + 1),
  }));
}

/**
 * Developer monthly utilization breakdown (12 months + 4 quarters + year).
 */
export function devUtilizationMatrix(
  allocations: Allocation[],
  developer: Developer,
  yearId: string
): { month: number; fte: number; capacity: number; utilization: number }[] {
  const cap = Number(developer.target_fte);
  const rows: { month: number; fte: number; capacity: number; utilization: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    const fte = devMonthTotal(allocations, developer.id, yearId, m);
    rows.push({
      month: m,
      fte,
      capacity: cap,
      utilization: cap > 0 ? fte / cap : 0,
    });
  }
  return rows;
}

/**
 * Developer quarterly FTE (sum of 3 months).
 */
export function devQuarterlyFTE(
  allocations: Allocation[],
  developerId: string,
  yearId: string
): number[] {
  return QUARTERS.map((q) => {
    let s = 0;
    for (const mi of q.months) {
      s += devMonthTotal(allocations, developerId, yearId, mi + 1);
    }
    return s;
  });
}
