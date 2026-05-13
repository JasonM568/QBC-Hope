/**
 * 綠界（ECPay）金流環境設定
 *
 * 測試環境（stage）：
 *   - AioCheckOut：https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5
 *   - 測試 MerchantID/HashKey/HashIV 為公開測試帳：
 *     MerchantID = "3002607"
 *     HashKey    = "pwFHCqoQZGmho4w6"
 *     HashIV     = "EkRm7iFT261dpevs"
 *
 * 正式環境（prod）：
 *   - AioCheckOut：https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5
 *   - 自己的 MerchantID / HashKey / HashIV
 *
 * 切換邏輯：
 *   ECPAY_ENV = "stage" | "prod"（預設 stage）
 *   缺值時若為 prod 直接 throw；stage 缺值會 fallback 至公開測試帳號，方便本機開發。
 */

export type EcpayEnv = "stage" | "prod";

export interface EcpayConfig {
  env: EcpayEnv;
  merchantId: string;
  hashKey: string;
  hashIv: string;
  /** AioCheckOut 付款表單 endpoint */
  aioCheckOutUrl: string;
  /** 對外可達的 site origin（callback / return 用），例：https://hope.huangxi.info */
  siteUrl: string;
  /** 發票：賣方資訊（顯示在發票上） */
  invoice: {
    sellerIdentifier: string; // 我方統編
    sellerName: string;
  };
}

// 綠界公開測試帳號（官方文件公布，僅 stage 可用）
const ECPAY_STAGE_TEST_ACCOUNT = {
  merchantId: "3002607",
  hashKey: "pwFHCqoQZGmho4w6",
  hashIv: "EkRm7iFT261dpevs",
} as const;

const ECPAY_AIO_URL = {
  stage: "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5",
  prod: "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5",
} as const;

function requireEnv(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`[ecpay] missing required env: ${name}`);
}

let cached: EcpayConfig | null = null;

export function getEcpayConfig(): EcpayConfig {
  if (cached) return cached;

  const env: EcpayEnv =
    (process.env.ECPAY_ENV as EcpayEnv | undefined) ?? "stage";
  const isProd = env === "prod";

  cached = {
    env,
    merchantId: isProd
      ? requireEnv("ECPAY_MERCHANT_ID")
      : requireEnv("ECPAY_MERCHANT_ID", ECPAY_STAGE_TEST_ACCOUNT.merchantId),
    hashKey: isProd
      ? requireEnv("ECPAY_HASH_KEY")
      : requireEnv("ECPAY_HASH_KEY", ECPAY_STAGE_TEST_ACCOUNT.hashKey),
    hashIv: isProd
      ? requireEnv("ECPAY_HASH_IV")
      : requireEnv("ECPAY_HASH_IV", ECPAY_STAGE_TEST_ACCOUNT.hashIv),
    aioCheckOutUrl: ECPAY_AIO_URL[env],
    siteUrl: requireEnv("NEXT_PUBLIC_SITE_URL", "https://hope.huangxi.info"),
    invoice: {
      sellerIdentifier: requireEnv("ECPAY_INVOICE_SELLER_IDENTIFIER", ""),
      sellerName: requireEnv("ECPAY_INVOICE_SELLER_NAME", "HOPE"),
    },
  };

  return cached;
}

/** 測試用：清掉 cache（單元測試切換 env 用） */
export function _resetEcpayConfigCache() {
  cached = null;
}
