const DAY_MS = 86_400_000;

export interface YearProgress {
  year: number;
  totalDays: number;
  dayOfYear: number;
  daysRemaining: number;
  percent: number;
}

export function getYearProgress(now: Date = new Date()): YearProgress {
  const year = now.getFullYear();
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  const totalDays = Math.round((end - start) / DAY_MS);

  const today = Date.UTC(year, now.getMonth(), now.getDate());
  const dayOfYear = Math.floor((today - start) / DAY_MS) + 1;
  const daysRemaining = totalDays - dayOfYear;

  const secondsIntoDay = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const fractionOfDay = secondsIntoDay / 86_400;
  const percent = ((dayOfYear - 1 + fractionOfDay) / totalDays) * 100;

  return { year, totalDays, dayOfYear, daysRemaining, percent };
}
