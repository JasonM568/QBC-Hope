/**
 * 綠界 AioCheckOut payload builder
 *
 * 三種訂單情境：
 *   1. 一次性付款（trial / annual / 加購點數）→ buildOneTimePayload
 *   2. 定期定額（月繳訂閱）→ buildRecurringPayload
 *   3. 任一情境都可附加發票（B2C 載具/捐贈 + B2B 統編三聯式）
 *
 * payload 直接 POST 到 config.aioCheckOutUrl，前端可把回傳的 fields 渲染成
 * <form action="..." method="post"> + hidden inputs + 自動 submit。
 *
 * 官方文件：
 *   AioCheckOut V5：https://developers.ecpay.com.tw/?p=2862
 *   定期定額：     https://developers.ecpay.com.tw/?p=5709
 *   電子發票一體式：https://developers.ecpay.com.tw/?p=5908
 */

import { calcCheckMacValue } from "./check-mac-value";
import { getEcpayConfig } from "./config";

// ---------- 共用型別 ----------

export type InvoiceCarrierType =
  | "mobile" // 手機條碼（/AB12345）
  | "citizen_digital" // 自然人憑證（XX12345678901234）
  | "member" // 會員載具（綠界 / 自家系統）
  | "paper" // 紙本郵寄
  | "donation"; // 捐贈（不開立、寫入受贈機構）

export interface InvoiceInfo {
  type: "b2c" | "b2b";
  buyerName: string;
  buyerEmail: string;
  /** B2B 必填、8 碼數字 */
  buyerTaxId?: string;
  carrierType?: InvoiceCarrierType;
  /** mobile：/開頭 8 碼；citizen_digital：16 碼大寫字母+數字 */
  carrierNum?: string;
  /** carrierType === 'donation' 時必填、3-7 碼 */
  donationCode?: string;
  /** 發票商品明細，預設用訂單名稱當單筆 */
  items?: Array<{ name: string; count: number; unit?: string; price: number }>;
}

export interface BaseOrderInfo {
  /** 我方訂單編號，需事先入庫；長度 ≤ 20 */
  merchantTradeNo: string;
  /** 顯示在綠界付款頁的訂單描述；長度 ≤ 200 */
  tradeDesc: string;
  /** 商品名稱；多個用 # 分隔，長度 ≤ 400 */
  itemName: string;
  totalAmount: number;
  /**
   * 付款完成 server-to-server callback（必填、需公開可達）
   * 例：https://hope.huangxi.info/api/subscription/callback
   */
  returnUrl: string;
  /** 付款完成後使用者瀏覽器導回的頁面（GET） */
  clientBackUrl?: string;
  /** 訂單成立後使用者瀏覽器導回的頁面（GET） */
  orderResultUrl?: string;
}

export interface OneTimeOrderInfo extends BaseOrderInfo {
  /** 付款方式；預設 'ALL' 由綠界顯示全部 */
  choosePayment?:
    | "ALL"
    | "Credit"
    | "WebATM"
    | "ATM"
    | "CVS"
    | "BARCODE"
    | "ApplePay";
}

export interface RecurringOrderInfo extends BaseOrderInfo {
  /** 每期金額（月繳 199） */
  periodAmount: number;
  /** 期數類型：D 日 / M 月 / Y 年（月繳固定 'M'） */
  periodType: "D" | "M" | "Y";
  /** 期間數（月繳 1 = 每 1 個月扣款一次） */
  frequency: number;
  /** 總執行期數，月繳通常 99 = 直到取消 */
  execTimes: number;
  /** 每次扣款成功的 server-to-server callback */
  periodReturnUrl: string;
}

// ---------- 工具 ----------

/**
 * 產生綠界規格的時間字串：yyyy/MM/dd HH:mm:ss（24h）
 */
export function formatMerchantTradeDate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/**
 * 載具類型 → 綠界 CarrierType 代碼
 *   ''(空字串) 紙本/捐贈 / '1' 綠界會員 / '2' 自然人憑證 / '3' 手機條碼
 */
function carrierTypeCode(t: InvoiceCarrierType | undefined): string {
  switch (t) {
    case "member":
      return "1";
    case "citizen_digital":
      return "2";
    case "mobile":
      return "3";
    case "paper":
    case "donation":
    default:
      return ""; // 紙本 / 捐贈 / 未指定
  }
}

/**
 * 組發票相關欄位（一體式 InvoiceMark=Y）
 *
 * 對應 SPEC 第 8.3 節
 */
function buildInvoiceFields(
  invoice: InvoiceInfo,
  fallbackItemName: string,
  totalAmount: number
): Record<string, string> {
  const isB2B = invoice.type === "b2b";
  const isDonation = invoice.carrierType === "donation";
  const isPaper = invoice.carrierType === "paper";

  const items =
    invoice.items && invoice.items.length > 0
      ? invoice.items
      : [{ name: fallbackItemName, count: 1, unit: "次", price: totalAmount }];

  return {
    InvoiceMark: "Y",
    // RelateNumber 必填、長度 ≤ 30，這裡直接用 merchantTradeNo 上層帶入
    CustomerIdentifier: invoice.buyerTaxId ?? "",
    CustomerName: invoice.buyerName,
    CustomerAddr: "",
    CustomerEmail: invoice.buyerEmail,
    ClearanceMark: "", // 1=經海關 / 2=非；國內服務空字串即可
    TaxType: "1", // 1=應稅
    CarrierType: isB2B || isDonation || isPaper ? "" : carrierTypeCode(invoice.carrierType),
    CarrierNum: isB2B || isDonation || isPaper ? "" : (invoice.carrierNum ?? ""),
    Donation: isDonation ? "1" : "0",
    LoveCode: isDonation ? (invoice.donationCode ?? "") : "",
    // B2B 統編必列印；B2C 紙本也必須列印；其餘載具/捐贈不列印
    Print: isB2B || isPaper ? "1" : "0",
    InvoiceItemName: items.map((i) => i.name).join("|"),
    InvoiceItemCount: items.map((i) => String(i.count)).join("|"),
    InvoiceItemWord: items.map((i) => i.unit ?? "次").join("|"),
    InvoiceItemPrice: items.map((i) => String(i.price)).join("|"),
    InvoiceItemTaxType: items.map(() => "1").join("|"),
    InvoiceRemark: "",
    DelayDay: "0", // 立即開立
    InvType: "07", // 07=一般稅額
  };
}

// ---------- 主要 builder ----------

export interface BuiltPayload {
  /** AioCheckOut 表單 action url */
  action: string;
  /** 完整 hidden inputs（含 CheckMacValue），按 key 排序 */
  fields: Record<string, string>;
}

/**
 * 建立一次性付款 payload（trial / annual / 加購點數）
 */
export function buildOneTimePayload(
  order: OneTimeOrderInfo,
  invoice?: InvoiceInfo
): BuiltPayload {
  const cfg = getEcpayConfig();

  const base: Record<string, string> = {
    MerchantID: cfg.merchantId,
    MerchantTradeNo: order.merchantTradeNo,
    MerchantTradeDate: formatMerchantTradeDate(),
    PaymentType: "aio",
    TotalAmount: String(order.totalAmount),
    TradeDesc: order.tradeDesc,
    ItemName: order.itemName,
    ReturnURL: order.returnUrl,
    ChoosePayment: order.choosePayment ?? "ALL",
    EncryptType: "1", // SHA256
    ...(order.clientBackUrl ? { ClientBackURL: order.clientBackUrl } : {}),
    ...(order.orderResultUrl ? { OrderResultURL: order.orderResultUrl } : {}),
  };

  if (invoice) {
    Object.assign(
      base,
      { RelateNumber: order.merchantTradeNo },
      buildInvoiceFields(invoice, order.itemName, order.totalAmount)
    );
  }

  base.CheckMacValue = calcCheckMacValue(base, {
    hashKey: cfg.hashKey,
    hashIv: cfg.hashIv,
  });

  return { action: cfg.aioCheckOutUrl, fields: base };
}

/**
 * 建立定期定額（月繳）付款 payload
 *
 * 月繳預設：periodType='M' / frequency=1 / execTimes=99（直到 CloseAgreement）
 */
export function buildRecurringPayload(
  order: RecurringOrderInfo,
  invoice?: InvoiceInfo
): BuiltPayload {
  const cfg = getEcpayConfig();

  const base: Record<string, string> = {
    MerchantID: cfg.merchantId,
    MerchantTradeNo: order.merchantTradeNo,
    MerchantTradeDate: formatMerchantTradeDate(),
    PaymentType: "aio",
    TotalAmount: String(order.totalAmount),
    TradeDesc: order.tradeDesc,
    ItemName: order.itemName,
    ReturnURL: order.returnUrl,
    ChoosePayment: "Credit", // 定期定額限信用卡
    EncryptType: "1",
    // 定期定額參數
    PeriodAmount: String(order.periodAmount),
    PeriodType: order.periodType,
    Frequency: String(order.frequency),
    ExecTimes: String(order.execTimes),
    PeriodReturnURL: order.periodReturnUrl,
    ...(order.clientBackUrl ? { ClientBackURL: order.clientBackUrl } : {}),
    ...(order.orderResultUrl ? { OrderResultURL: order.orderResultUrl } : {}),
  };

  if (invoice) {
    Object.assign(
      base,
      { RelateNumber: order.merchantTradeNo },
      buildInvoiceFields(invoice, order.itemName, order.totalAmount)
    );
  }

  base.CheckMacValue = calcCheckMacValue(base, {
    hashKey: cfg.hashKey,
    hashIv: cfg.hashIv,
  });

  return { action: cfg.aioCheckOutUrl, fields: base };
}
