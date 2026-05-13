/**
 * ECPay SDK helpers
 *
 * 使用範例：
 *   import { buildOneTimePayload, parseCallback, ECPAY_CALLBACK_ACK } from '@/lib/ecpay'
 */

export { getEcpayConfig } from "./config";
export type { EcpayConfig, EcpayEnv } from "./config";

export { calcCheckMacValue, verifyCheckMacValue } from "./check-mac-value";

export {
  buildOneTimePayload,
  buildRecurringPayload,
  formatMerchantTradeDate,
} from "./aio-checkout";
export type {
  BuiltPayload,
  BaseOrderInfo,
  OneTimeOrderInfo,
  RecurringOrderInfo,
  InvoiceInfo,
  InvoiceCarrierType,
} from "./aio-checkout";

export {
  parseCallback,
  verifyCallback,
  ECPAY_CALLBACK_ACK,
} from "./callback";
export type {
  OneTimeCallback,
  RecurringCallback,
  ParsedCallback,
} from "./callback";
