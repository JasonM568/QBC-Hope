// Email 網域拼字防呆：偵測 gamil.com → gmail.com 這類常見打錯，回傳建議修正字串。
// 純前端、純提示，不強制擋下。參考 mailcheck 的三層比對（完整網域 / 次級網域 / 頂級網域）。

// 台灣常見完整網域（含 ISP 信箱）
const DOMAINS = [
  "gmail.com",
  "yahoo.com.tw",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "me.com",
  "live.com",
  "msn.com",
  "aol.com",
  "pchome.com.tw",
  "seed.net.tw",
  "hinet.net",
  "msa.hinet.net",
  "ms1.hinet.net",
  "ms24.hinet.net",
];

// 次級網域（@ 後面、第一個點之前那段）
const SECOND_LEVEL = [
  "gmail",
  "yahoo",
  "hotmail",
  "outlook",
  "icloud",
  "live",
  "msn",
  "aol",
  "me",
  "pchome",
  "hinet",
];

// 頂級／後綴
const TOP_LEVEL = [
  "com",
  "com.tw",
  "net",
  "net.tw",
  "org",
  "org.tw",
  "edu.tw",
  "gov.tw",
  "tw",
];

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

// 在候選清單裡找出與 input 最接近、且距離在門檻內的項目（完全相同則回 null）
function closest(input: string, list: string[], threshold: number): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const candidate of list) {
    if (candidate === input) return null; // 已經正確，不需建議
    const dist = levenshtein(input, candidate);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best !== null && bestDist > 0 && bestDist <= threshold ? best : null;
}

/**
 * 偵測 email 網域拼字錯誤。
 * @returns 建議的完整 email（例如 user@gmail.com），若沒有可疑拼錯則回 null。
 */
export function suggestEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 1 || at === trimmed.length - 1) return null;

  const local = email.trim().slice(0, email.trim().lastIndexOf("@"));
  const domain = trimmed.slice(at + 1);
  if (!domain.includes(".")) return null;

  // 已經是已知正確網域 → 不提示
  if (DOMAINS.includes(domain)) return null;

  // 第一層：整個網域比對（門檻 2，可抓 gamil.com→gmail.com、gmial.com、yaho.com.tw）
  const wholeLen = domain.length;
  const wholeThreshold = wholeLen <= 6 ? 1 : 2;
  const whole = closest(domain, DOMAINS, wholeThreshold);
  if (whole) return `${local}@${whole}`;

  // 第二層：拆成 sld + tld，各自比對後組合（可抓 gmail.con、hotmail.cm 等）
  const firstDot = domain.indexOf(".");
  const sld = domain.slice(0, firstDot);
  const tld = domain.slice(firstDot + 1);

  const sldFix = SECOND_LEVEL.includes(sld) ? sld : closest(sld, SECOND_LEVEL, sld.length <= 5 ? 1 : 2);
  const tldFix = TOP_LEVEL.includes(tld) ? tld : closest(tld, TOP_LEVEL, 1);

  if (sldFix || tldFix) {
    const fixedDomain = `${sldFix ?? sld}.${tldFix ?? tld}`;
    if (fixedDomain !== domain && DOMAINS.includes(fixedDomain)) {
      return `${local}@${fixedDomain}`;
    }
    // 即使組合後不在完整清單，只要有修正到 sld 或 tld 也提示
    if (fixedDomain !== domain && (sldFix || tldFix)) {
      return `${local}@${fixedDomain}`;
    }
  }

  return null;
}
