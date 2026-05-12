/**
 * 牌卡每日次數限制的角色判定。
 *
 * 一般學員 (student)：每天只能抽 1 張，培養儀式感。
 * 教練 (coach)、總教練 (master)、管理員 (admin)、測試者 (tester)：
 *   為了輔導學員、測試新解讀、後台維護等用途，不受每日限制。
 */
export const ORACLE_UNLIMITED_ROLES = new Set([
  "coach",
  "admin",
  "master",
  "tester",
]);

export function isOracleUnlimited(
  role: string | null | undefined
): boolean {
  return !!role && ORACLE_UNLIMITED_ROLES.has(role);
}
