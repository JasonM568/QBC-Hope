/**
 * 綠界 callback 驗證
 *
 * 綠界三種 callback：
 *   - ReturnURL（一次性付款結果，server-to-server，必須回 "1|OK"）
 *   - PeriodReturnURL（定期定額每期扣款結果）
 *   - OrderResultURL（瀏覽器導回的訂單結果，POST）
 *
 * 共通：
 *   - Content-Type: application/x-www-form-urlencoded
 *   - 含 CheckMacValue 欄位
 *   - RtnCode = 1 代表成功；其他 code 視為失敗
 */

import { getEcpayConfig } from "./config";
import { verifyCheckMacValue } from "./check-mac-value";

/** 一次性付款 callback 主要欄位（綠界文件 P5-4） */
export interface OneTimeCallback {
  MerchantID: string;
  MerchantTradeNo: string;
  TradeNo: string;
  RtnCode: string; // "1" = 成功
  RtnMsg: string;
  TradeAmt: string;
  PaymentDate: string; // "yyyy/MM/dd HH:mm:ss"
  PaymentType: string;
  TradeDate: string;
  /** 發票相關（InvoiceMark=Y 才有） */
  InvoiceNo?: string;
  InvoiceTime?: string;
  CheckMacValue: string;
  /** 其他可能欄位 */
  [k: string]: string | undefined;
}

/** 定期定額每期扣款 callback */
export interface RecurringCallback extends OneTimeCallback {
  /** 綠界回傳的合約編號（首期成功後才有） */
  gwsr?: string;
  /** 已執行期數 */
  TotalSuccessTimes?: string;
  TotalSuccessAmount?: string;
}

export interface ParsedCallback<T> {
  ok: boolean;
  /** 驗章 + RtnCode 都通過才為 true */
  paid: boolean;
  reason?: string;
  payload: T;
}

/**
 * 從 Next.js Request 解析 ECPay form callback 並驗章。
 *
 * 用法：
 *   const r = await parseCallback<OneTimeCallback>(req)
 *   if (!r.ok) return new Response('0|InvalidSignature', { status: 400 })
 *   if (r.paid) { ...入庫... }
 *   return new Response('1|OK')   // 不管成功失敗都要回 1|OK，否則綠界會重送
 */
export async function parseCallback<T extends OneTimeCallback = OneTimeCallback>(
  req: Request
): Promise<ParsedCallback<T>> {
  const raw = await req.text();
  const params = parseFormUrlEncoded(raw);
  return verifyCallback<T>(params);
}

/**
 * 已解析好的 form params 直接驗章（單元測試 / 非 Request 來源用）。
 */
export function verifyCallback<T extends OneTimeCallback = OneTimeCallback>(
  params: Record<string, string>
): ParsedCallback<T> {
  const cfg = getEcpayConfig();

  const valid = verifyCheckMacValue(params, {
    hashKey: cfg.hashKey,
    hashIv: cfg.hashIv,
  });

  if (!valid) {
    return {
      ok: false,
      paid: false,
      reason: "checkmacvalue_mismatch",
      payload: params as unknown as T,
    };
  }

  const rtnCode = params.RtnCode;
  const paid = rtnCode === "1";

  return {
    ok: true,
    paid,
    reason: paid ? undefined : `rtn_${rtnCode}_${params.RtnMsg ?? ""}`,
    payload: params as unknown as T,
  };
}

/**
 * 綠界 callback 成功 / 失敗都要回這個字串，否則它會 retry。
 */
export const ECPAY_CALLBACK_ACK = "1|OK";

// ---------- 內部工具 ----------

function parseFormUrlEncoded(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parts = body.split("&");
  for (const part of parts) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq < 0) {
      out[decodeURIComponent(part.replace(/\+/g, " "))] = "";
      continue;
    }
    const k = decodeURIComponent(part.slice(0, eq).replace(/\+/g, " "));
    const v = decodeURIComponent(part.slice(eq + 1).replace(/\+/g, " "));
    out[k] = v;
  }
  return out;
}
