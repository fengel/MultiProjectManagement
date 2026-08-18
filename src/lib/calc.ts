import type { Allocation, Developer, Project, Year, DeveloperSalaryEntry, ExtraPayment } from '@/lib/types';
import { MONTH_NAMES, QUARTERS } from '@/lib/types';

/**
 * Get effective monthly rate for a developer in a given year and month.
 * Finds the most recent salary entry that starts on or before the given month.
 * Falls back to developer.monthly_rate if no salary entry exists for that year.
 */
export function getEffectiveMonthlyRateForMonth(
  developerId: string,
  year: number,
  month: number, // 1-12
  salaryEntries: DeveloperSalaryEntry[],
  developers: Developer[]
): number {
  // Find all salary entries for this developer and year
  const yearSalaries = salaryEntries.filter((s) => s.developer_id === developerId && s.year === year);
  
  // Find the most recent salary entry that starts on or before this month
  let effectiveRate: number | null = null;
  for (const salary of yearSalaries.sort((a, b) => Number(b.start_month) - Number(a.start_month))) {
    if (Number(salary.start_month) <= month) {
      effectiveRate = Number(salary.monthly_rate);
      break;
    }
  }
  
  if (effectiveRate !== null) return effectiveRate;
  
  const dev = developers.find((d) => d.id === developerId);
  return dev ? Number(dev.monthly_rate) : 0;
}

/**
 * Get effective monthly rate for a developer in a given year (legacy - uses Jan 1 / month 1).
 * Falls back to developer.monthly_rate if no salary entry exists for that year.
 */
export function getEffectiveMonthlyRate(
  developerId: string,
  year: number,
  salaryEntries: DeveloperSalaryEntry[],
  developers: Developer[]
): number {
  return getEffectiveMonthlyRateForMonth(developerId, year, 1, salaryEntries, developers);
}

/**
 * Get total extra payments for a developer in a given year.
 */
export function getTotalExtraPayments(
  developerId: string,
  year: number,
  extraPayments: ExtraPayment[]
): number {
  return extraPayments
    .filter((p) => p.developer_id === developerId && p.year === year)
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

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
 * Accounts for salary changes that occur during the year.
 */
export function projectWeightedRate(
  allocations: Allocation[],
  projectId: string,
  yearId: string,
  developers: Developer[],
  year: Year,
  salaryEntries: DeveloperSalaryEntry[] = []
): number {
  const devs = new Map(developers.map((d) => [d.id, d]));
  let weightedSum = 0;
  let totalWeight = 0;
  
  // Calculate weighted rate across all months
  for (let month = 1; month <= 12; month++) {
    for (const a of allocations) {
      if (a.project_id !== projectId || a.year_id !== yearId || a.month !== month) continue;
      const dev = devs.get(a.developer_id);
      if (!dev) continue;
      const rate = getEffectiveMonthlyRateForMonth(dev.id, year.year, month, salaryEntries, developers);
      const w = Number(a.allocation_pct);
      weightedSum += rate * w;
      totalWeight += w;
    }
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Total budget for a project across the year.
 * Budget = sum over months of (monthlyFTE * effectiveMonthlyRate) + extra payments allocated to this project
 * Accounts for salary changes that occur during the year.
 */
export function projectTotalBudget(
  allocations: Allocation[],
  projectId: string,
  year: Year,
  developers: Developer[],
  salaryEntries: DeveloperSalaryEntry[] = [],
  extraPayments: ExtraPayment[] = []
): number {
  const devs = new Map(developers.map((d) => [d.id, d]));
  let budget = 0;
  
  // Calculate budget month by month, using the appropriate rate for each month
  for (let month = 1; month <= 12; month++) {
    const monthAllocations = allocations.filter((a) => a.project_id === projectId && a.year_id === year.id && a.month === month);
    for (const a of monthAllocations) {
      const dev = devs.get(a.developer_id);
      if (!dev) continue;
      const rate = getEffectiveMonthlyRateForMonth(dev.id, year.year, month, salaryEntries, developers);
      const fte = Number(a.allocation_pct);
      budget += fte * rate;
    }
  }
  
  // Add extra payments proportional to allocation
  const projectAllocations = allocations.filter((a) => a.project_id === projectId && a.year_id === year.id);
  const devIds = new Set(projectAllocations.map((a) => a.developer_id));
  const totalAllocatedToProject = projectAllocations.reduce((sum, a) => sum + Number(a.allocation_pct), 0);
  
  for (const devId of devIds) {
    const devProjectFTE = projectAllocations
      .filter((a) => a.developer_id === devId)
      .reduce((sum, a) => sum + Number(a.allocation_pct), 0);
    const devExtraPayments = extraPayments
      .filter((p) => p.developer_id === devId && p.year === year.year)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    
    if (totalAllocatedToProject > 0) {
      const proportion = devProjectFTE / totalAllocatedToProject;
      budget += devExtraPayments * proportion;
    }
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
  developers: Developer[],
  salaryEntries: DeveloperSalaryEntry[] = [],
  extraPayments: ExtraPayment[] = []
): number {
  return projects.reduce(
    (sum, p) => sum + projectTotalBudget(allocations, p.id, year, developers, salaryEntries, extraPayments),
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

/**
 * Calculate total spending for an employee over the year.
 * Includes: salary cost (month by month) + extra payments + allocated project budget share
 */
export function devYearlySpending(
  developerId: string,
  year: Year,
  salaryEntries: DeveloperSalaryEntry[],
  developers: Developer[],
  extraPayments: ExtraPayment[],
  allocations: Allocation[]
): { salary: number; extraPayments: number; total: number } {
  let salary = 0;
  
  // Calculate salary cost month by month
  for (let month = 1; month <= 12; month++) {
    const monthlyRate = getEffectiveMonthlyRateForMonth(developerId, year.year, month, salaryEntries, developers);
    salary += monthlyRate;
  }
  
  // Get extra payments for this developer in this year
  const devExtraPayments = extraPayments
    .filter((p) => p.developer_id === developerId && p.year === year.year)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  
  return {
    salary,
    extraPayments: devExtraPayments,
    total: salary + devExtraPayments,
  };
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
