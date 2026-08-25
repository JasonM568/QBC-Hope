/**
 * 21 天輪程的達成率計算。
 *
 * 公式：達成率 = 已完成天數 ÷ 應完成天數
 *
 * 「應完成天數」只算到**昨天**為止，今天不列入分母 —— 今天還沒過完，
 * 早上九點還沒填日報不該被當成沒達成。輪程走完之後分母自然收斂成 21。
 *
 * 分子同樣只算到昨天，否則先填了「明天」的日報會讓達成率超過 100%。
 */

export const ROUND_LENGTH = 21;

/** YYYY-MM-DD 加減天數（用 UTC 運算避免時區位移） */
export function addDaysISO(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * 86400000).toISOString().split("T")[0];
}

/** b - a，以天為單位 */
export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/** 該輪最後一天（起始日為 Day 1，故 +20） */
export function roundEndDate(startDate: string): string {
  return addDaysISO(startDate, ROUND_LENGTH - 1);
}

/** 今天的台北日期字串 */
export function taipeiToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
}

export interface CompletionResult {
  /** 應完成天數（分母）。輪程第一天為 0 */
  expected: number;
  /** 已完成天數（分子） */
  completed: number;
  /** 缺漏天數 */
  missed: number;
  /** 達成率百分比，四捨五入到小數一位。expected 為 0 時回 null */
  rate: number | null;
  /** 統計截止日（含），即 min(昨天, 該輪最後一天） */
  cutoff: string | null;
  /** 該輪是否已經走完日曆天 */
  isFinished: boolean;
  /** 今天是該輪第幾天（1-based，可能 > 21） */
  dayNumber: number;
}

/**
 * 計算進行中（或剛結束）輪程的達成率。
 *
 * @param startDate  該輪起始日 YYYY-MM-DD
 * @param today      今天（台北）YYYY-MM-DD
 * @param filledDates 該會員所有已填日報的日期集合
 */
export function computeCompletion(
  startDate: string,
  today: string,
  filledDates: Set<string> | string[]
): CompletionResult {
  const filled = filledDates instanceof Set ? filledDates : new Set(filledDates);
  const endDate = roundEndDate(startDate);
  const dayNumber = diffDays(startDate, today) + 1;
  const isFinished = today > endDate;

  // 統計到「昨天」與「該輪最後一天」孰早
  const yesterday = addDaysISO(today, -1);
  const cutoff = yesterday < endDate ? yesterday : endDate;

  // 輪程還沒過完第一天 → 沒有東西可以統計
  if (cutoff < startDate) {
    return {
      expected: 0, completed: 0, missed: 0, rate: null,
      cutoff: null, isFinished, dayNumber,
    };
  }

  const expected = diffDays(startDate, cutoff) + 1;

  let completed = 0;
  for (let i = 0; i < expected; i++) {
    if (filled.has(addDaysISO(startDate, i))) completed++;
  }

  return {
    expected,
    completed,
    missed: expected - completed,
    rate: Math.round((completed / expected) * 1000) / 10,
    cutoff,
    isFinished,
    dayNumber,
  };
}

/** 封存輪程的達成率：分母固定 21 */
export function archivedRate(completedDays: number): number {
  return Math.round((completedDays / ROUND_LENGTH) * 1000) / 10;
}

/**
 * 找出「還來得及補、但目前空著」的日期。
 *
 * 補填窗口是 today ± 1 天，所以真正還救得回來的只有昨天。
 * 回傳 null 代表沒有需要提醒的缺漏。
 */
export function findRecoverableMiss(
  startDate: string | null,
  today: string,
  filledDates: Set<string> | string[]
): string | null {
  if (!startDate) return null;
  const filled = filledDates instanceof Set ? filledDates : new Set(filledDates);
  const yesterday = addDaysISO(today, -1);

  // 昨天必須落在本輪窗口內，且還沒填
  if (yesterday < startDate) return null;
  if (yesterday > roundEndDate(startDate)) return null;
  if (filled.has(yesterday)) return null;

  return yesterday;
}

/** 達成率的顯示色階 */
export function rateTone(rate: number | null): string {
  if (rate === null) return "text-muted-foreground";
  if (rate >= 90) return "text-green-400";
  if (rate >= 70) return "text-gold";
  return "text-red-400";
}
