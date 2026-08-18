export interface Year {
  id: string;
  year: number;
  working_days_per_month: number;
  is_active: boolean;
}

export interface Developer {
  id: string;
  name: string;
  role: string;
  monthly_rate: number;
  target_fte: number;
  sort_order: number;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  status: 'Active' | 'Planning';
  sort_order: number;
}

export interface Allocation {
  id: string;
  developer_id: string;
  project_id: string;
  year_id: string;
  month: number;
  allocation_pct: number;
}

export interface DeveloperSalaryEntry {
  id: string;
  developer_id: string;
  year: number;
  start_month: number; // 1-12
  monthly_rate: number;
}

export interface ExtraPayment {
  id: string;
  developer_id: string;
  year: number;
  amount: number;
  description?: string;
}

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const QUARTERS = [
  { label: 'Q1', months: [0, 1, 2] },
  { label: 'Q2', months: [3, 4, 5] },
  { label: 'Q3', months: [6, 7, 8] },
  { label: 'Q4', months: [9, 10, 11] },
];
