/**
 * 綠界 CheckMacValue 計算
 *
 * 演算法（SHA256 / EncryptType=1）：
 *   1. 移除 CheckMacValue 自身（若存在）；空字串欄位不送，但若客戶送則保留。
 *   2. 將 key 按 ASCII 字母排序（不分大小寫）。
 *   3. 組字串：HashKey=xxx&Key1=Val1&Key2=Val2&...&HashIV=yyy
 *   4. 全字串做 URL encode（仿 .NET HttpUtility.UrlEncode 行為）。
 *   5. 整段轉小寫。
 *   6. SHA256 hash。
 *   7. 結果轉大寫十六進位。
 *
 * .NET 與 JS encodeURIComponent 的差異：
 *   .NET 不編 `-_.!*()`，且空白編成 `+` 而非 `%20`。
 *   encodeURIComponent 不編 `-_.!*()`、但編 `*` 為 `*`（一致）、空白編成 `%20`。
 *   實務上整段 toLowerCase() 後綠界比對通過，但仍需把 `%20` → `+` 並還原 .NET 不編的字元。
 *
 * 官方參考：
 *   https://developers.ecpay.com.tw/?p=2902 (AIO 介紹)
 *   https://developers.ecpay.com.tw/?p=2904 (CheckMacValue 範例)
 */

import { createHash } from "crypto";

/**
 * 仿 .NET HttpUtility.UrlEncode：
 *   - 空白 → +（不是 %20）
 *   - 保留 .NET 不編的字元：-_.!*()
 *   - 其餘照 encodeURIComponent
 *   - 全部小寫（含 hex code）
 */
function dotNetUrlEncode(input: string): string {
  return encodeURIComponent(input)
    .replace(/%20/g, "+")
    .replace(/'/g, "%27")
    .replace(/~/g, "%7e")
    .toLowerCase();
}

export interface CheckMacValueOptions {
  hashKey: string;
  hashIv: string;
}

/**
 * 計算 CheckMacValue
 *
 * @param params  綠界 AioCheckOut 參數（不含 CheckMacValue 本身）
 * @param opts    { hashKey, hashIv }
 * @returns       64 位大寫十六進位 SHA256 digest
 */
export function calcCheckMacValue(
  params: Record<string, string | number | undefined | null>,
  opts: CheckMacValueOptions
): string {
  const { hashKey, hashIv } = opts;

  // 1. 過濾掉 undefined / null / CheckMacValue 自身（保留空字串 ""）
  const filtered: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(params)) {
    if (k === "CheckMacValue") continue;
    if (v === undefined || v === null) continue;
    filtered.push([k, String(v)]);
  }

  // 2. 按 key ASCII 排序（不分大小寫）
  filtered.sort(([a], [b]) =>
    a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0
  );

  // 3. 組字串：HashKey=xxx&Key1=Val1&...&HashIV=yyy
  const middle = filtered.map(([k, v]) => `${k}=${v}`).join("&");
  const raw = `HashKey=${hashKey}&${middle}&HashIV=${hashIv}`;

  // 4. URL encode（.NET 風格）+ 5. toLowerCase（dotNetUrlEncode 已含）
  const encoded = dotNetUrlEncode(raw);

  // 6+7. SHA256 → 大寫 hex
  return createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

/**
 * 驗證綠界回傳的 CheckMacValue 是否合法
 *
 * 用於：
 *   - POST callback（ReturnURL / OrderResultURL / PaymentInfoURL）
 *   - GET return（ClientBackURL 雖然官方不簽，但發票 callback 等其他端點會簽）
 *
 * 比對為「常數時間」（timingSafeEqual）以防 timing attack。
 */
export function verifyCheckMacValue(
  params: Record<string, string | number | undefined | null>,
  opts: CheckMacValueOptions
): boolean {
  const received = params.CheckMacValue;
  if (typeof received !== "string" || received.length === 0) return false;

  const expected = calcCheckMacValue(params, opts);

  // 兩者皆 64 chars 大寫 hex；長度不等直接 false
  if (received.length !== expected.length) return false;

  // 常數時間比對
  const a = Buffer.from(received.toUpperCase(), "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
