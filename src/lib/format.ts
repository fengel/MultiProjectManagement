export const fmtEUR = (n: number): string =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(isFinite(n) ? n : 0);

export const fmtEUR2 = (n: number): string =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(isFinite(n) ? n : 0);

export const fmtPct = (n: number): string =>
  `${(isFinite(n) ? n * 100 : 0).toFixed(0)}%`;

export const fmtPct1 = (n: number): string =>
  `${(isFinite(n) ? n * 100 : 0).toFixed(1)}%`;

export const fmtNum = (n: number, digits = 0): string =>
  new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(isFinite(n) ? n : 0);

export const fmtFTE = (n: number): string =>
  `${fmtNum(n, 2)} FTE`;
