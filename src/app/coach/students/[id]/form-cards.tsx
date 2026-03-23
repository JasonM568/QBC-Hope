"use client";

import { useState } from "react";

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div className="mt-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{String(value)}</p>
    </div>
  );
}

function Check({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className={`text-xs ${checked ? "text-gold" : "text-muted-foreground/40"}`}>
      {checked ? "✓" : "○"} {label}
    </span>
  );
}

/* ============================================================
   週報卡片
   ============================================================ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function WeeklyCard({ report: r }: { report: any }) {
  const [expanded, setExpanded] = useState(false);
  const total = (r.shares_count || 0) + (r.helps_count || 0) + (r.referrals_count || 0);

  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{r.year} 年 第 {r.week_number} 週</span>
        <span className="text-xs text-gold">利他總計 {total} 次</span>
      </div>
      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
        <span>分享 {r.shares_count || 0}</span>
        <span>幫助 {r.helps_count || 0}</span>
        <span>推薦 {r.referrals_count || 0}</span>
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 px-3 py-1 text-xs font-semibold rounded-full bg-gold text-black hover:bg-gold-light transition-colors"
      >
        {expanded ? "收合詳情" : "查看詳情"}
      </button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border">
          <Field label="分享詳情" value={r.shares_detail} />
          <Field label="幫助詳情" value={r.helps_detail} />
          <Field label="推薦詳情" value={r.referrals_detail} />
          <Field label="本週反思" value={r.reflection} />
        </div>
      )}
    </div>
  );
}

/* ============================================================
   月報卡片
   ============================================================ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function MonthlyCard({ report: r }: { report: any }) {
  const [expanded, setExpanded] = useState(false);
  const total = (r.career_score || 0) + (r.wealth_score || 0) + (r.health_score || 0) + (r.family_score || 0) + (r.relation_score || 0);
  const incomeMap: Record<string, string> = { growth: "成長", stable: "持平", decline: "下降" };
  const routineMap: Record<string, string> = { regular: "規律", normal: "普通", poor: "不佳" };

  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{r.year} 年 {r.month} 月</span>
        <span className="text-xs text-gold">總分 {total}/100</span>
      </div>
      <div className="mt-2 space-y-1">
        {[
          { label: "事業", score: r.career_score },
          { label: "財富", score: r.wealth_score },
          { label: "健康", score: r.health_score },
          { label: "家庭", score: r.family_score },
          { label: "關係", score: r.relation_score },
        ].map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="text-xs w-8 text-muted-foreground">{d.label}</span>
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-gold rounded-full" style={{ width: `${((d.score || 0) / 20) * 100}%` }} />
            </div>
            <span className="text-xs font-semibold w-8 text-right">{d.score || 0}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 px-3 py-1 text-xs font-semibold rounded-full bg-gold text-black hover:bg-gold-light transition-colors"
      >
        {expanded ? "收合詳情" : "查看詳情"}
      </button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          <div className="flex gap-4 text-xs">
            <span>滿意度：{r.satisfaction}/10</span>
            <span>關鍵字：{r.monthly_keywords || "—"}</span>
          </div>
          <div>
            <p className="text-xs text-gold font-medium">事業 Career</p>
            <Field label="創造的價值" value={r.career_value} />
            <Field label="成就" value={r.career_achievement} />
            <Field label="卡關" value={r.career_stuck} />
            <Field label="下月優化" value={r.career_next} />
          </div>
          <div>
            <p className="text-xs text-gold font-medium">財富 Wealth</p>
            <Field label="收入變化" value={incomeMap[r.wealth_income_change] || r.wealth_income_change} />
            <Field label="新增收入來源" value={r.wealth_new_source} />
            <Field label="投資/資產變化" value={r.wealth_investment} />
            <Field label="下月優化" value={r.wealth_next} />
          </div>
          <div>
            <p className="text-xs text-gold font-medium">健康 Health</p>
            <Field label="作息" value={routineMap[r.health_routine] || r.health_routine} />
            <Field label="健康狀態" value={r.health_status} />
            <Field label="運動頻率" value={r.health_exercise} />
            <Field label="下月優化" value={r.health_next} />
          </div>
          <div>
            <p className="text-xs text-gold font-medium">家庭 Family</p>
            <Field label="家人抱怨" value={r.family_complaint ? `是：${r.family_complaint_reason || ""}` : "否"} />
            <Field label="陪伴活動" value={r.family_activity} />
            <Field label="關鍵互動" value={r.family_interaction} />
            <Field label="下月優化" value={r.family_next} />
          </div>
          <div>
            <p className="text-xs text-gold font-medium">關係 Relationship</p>
            <Field label="新連結" value={r.relation_new_connection ? "是" : "否"} />
            <Field label="新增重要連結" value={r.relation_new_important} />
            <Field label="重要互動事件" value={r.relation_interaction} />
            <Field label="下月優化" value={r.relation_next} />
          </div>
          <div>
            <p className="text-xs text-gold font-medium">本月關鍵反思</p>
            <Field label="最重要的突破" value={r.reflection_breakthrough} />
            <Field label="最大的學習" value={r.reflection_learning} />
            <Field label="最大的錯誤" value={r.reflection_mistake} />
          </div>
          <div>
            <p className="text-xs text-gold font-medium">人生平衡檢視</p>
            <Field label="最強領域" value={r.balance_strongest} />
            <Field label="最弱領域" value={r.balance_weakest} />
            <Field label="原因" value={r.balance_reason} />
          </div>
          <div>
            <p className="text-xs text-gold font-medium">下月成長策略</p>
            <Field label="下月最重要三件事" value={r.next_three_things} />
            <Field label="五域優先順序" value={r.next_domain_order} />
            <Field label="亮點" value={r.highlight} />
            <Field label="重要改變" value={r.important_change} />
            <Field label="下一步" value={r.next_step} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   資本盤點卡片
   ============================================================ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CapitalCard({ report: r }: { report: any }) {
  const [expanded, setExpanded] = useState(false);
  const cycleMap: Record<string, string> = { first: "首次", half_year: "半年", annual: "年度" };
  const difficultyMap: Record<string, string> = { quick_recover: "快速恢復", need_time: "需要時間", give_up: "容易放棄" };
  const futureMap: Record<string, string> = { very_confident: "非常有信心", normal: "一般", uncertain: "不確定" };
  const evalMap: Record<string, string> = { beginner: "起步期", stable: "穩定期", fast: "快速成長期", mature: "成熟期" };
  const ecoTotal = (r.eco_score_a || 0) + (r.eco_score_b || 0);
  const knowTotal = (r.know_score_a || 0) + (r.know_score_b || 0);
  const socialTotal = (r.social_score_a || 0) + (r.social_score_b || 0);
  const psychTotal = (r.psych_score_a || 0) + (r.psych_score_b || 0);
  const grandTotal = ecoTotal + knowTotal + socialTotal + psychTotal;

  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{r.inventory_date}</span>
        <div className="flex gap-2 text-xs">
          <span className="text-gold">總分 {grandTotal}/100</span>
          {r.inventory_cycle && <span className="text-muted-foreground">{cycleMap[r.inventory_cycle] || r.inventory_cycle}</span>}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <span>經濟資本：{ecoTotal}/25</span>
        <span>智識資本：{knowTotal}/25</span>
        <span>社會資本：{socialTotal}/25</span>
        <span>心理資本：{psychTotal}/25</span>
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 px-3 py-1 text-xs font-semibold rounded-full bg-gold text-black hover:bg-gold-light transition-colors"
      >
        {expanded ? "收合詳情" : "查看詳情"}
      </button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          <Field label="目前工作" value={r.current_job} />
          <Field label="人生目標" value={r.life_goal} />
          <div>
            <p className="text-xs text-gold font-medium">經濟資本 ({ecoTotal}/25)</p>
            <Field label="收入來源" value={r.eco_income_source} />
            <Field label="收入穩定度" value={r.eco_income_stability === "stable" ? "穩定" : r.eco_income_stability === "moderate" ? "中等" : "不穩定"} />
            <Field label="資產規模" value={r.eco_asset_amount} />
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
              <Check checked={r.eco_asset_cash} label="現金" />
              <Check checked={r.eco_asset_stock} label="股票" />
              <Check checked={r.eco_asset_realestate} label="不動產" />
              <Check checked={r.eco_asset_equity} label="股權" />
              <Check checked={r.eco_asset_other} label="其他" />
            </div>
          </div>
          <div>
            <p className="text-xs text-gold font-medium">智識資本 ({knowTotal}/25)</p>
            <Field label="核心專業" value={r.know_core_expertise} />
            <Field label="年閱讀量" value={r.know_books_per_year} />
            <Field label="年課程數" value={r.know_courses_per_year} />
          </div>
          <div>
            <p className="text-xs text-gold font-medium">社會資本 ({socialTotal}/25)</p>
            <Field label="關鍵人物" value={r.social_key_people} />
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
              <Check checked={r.social_cooperate} label="合作" />
              <Check checked={r.social_introduce} label="介紹" />
              <Check checked={r.social_invest} label="投資" />
            </div>
          </div>
          <div>
            <p className="text-xs text-gold font-medium">心理資本 ({psychTotal}/25)</p>
            <Field label="面對困難" value={difficultyMap[r.psych_difficulty] || r.psych_difficulty} />
            <Field label="對未來信心" value={futureMap[r.psych_future] || r.psych_future} />
          </div>
          <Field label="總體評估" value={evalMap[r.overall_evaluation] || r.overall_evaluation} />
          <div>
            <p className="text-xs text-gold font-medium">六個月成長計劃</p>
            <Field label="經濟" value={r.growth_plan_economic} />
            <Field label="智識" value={r.growth_plan_knowledge} />
            <Field label="社會" value={r.growth_plan_social} />
            <Field label="心理" value={r.growth_plan_psychological} />
          </div>
          {r.has_grown && (
            <div>
              <p className="text-xs text-gold font-medium">前後比較</p>
              <div className="grid grid-cols-2 gap-1 text-xs mt-1">
                <span>經濟：{r.before_economic} → {r.after_economic}</span>
                <span>智識：{r.before_knowledge} → {r.after_knowledge}</span>
                <span>社會：{r.before_social} → {r.after_social}</span>
                <span>心理：{r.before_psychological} → {r.after_psychological}</span>
              </div>
              <Field label="是否成長" value={r.has_grown === "yes" ? "是" : "否"} />
              <Field label="成長反思" value={r.growth_reflection} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   戰略定位卡片
   ============================================================ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function StrategyCard({ report: r }: { report: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{r.position_date || new Date(r.created_at).toLocaleDateString("en-CA")}</span>
      </div>
      {r.positioning_statement && (
        <p className="text-sm text-gold mt-1">{r.positioning_statement}</p>
      )}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 px-3 py-1 text-xs font-semibold rounded-full bg-gold text-black hover:bg-gold-light transition-colors"
      >
        {expanded ? "收合詳情" : "查看詳情"}
      </button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          <div>
            <p className="text-xs text-gold font-medium">PART 1 優勢分析</p>
            <Field label="核心能力" value={r.core_ability} />
            <Field label="成功經驗" value={r.success_experience} />
            <Field label="獨特能力" value={r.unique_ability} />
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
              <Check checked={r.resource_tech} label="技術" />
              <Check checked={r.resource_network} label="人脈" />
              <Check checked={r.resource_fund} label="資金" />
              <Check checked={r.resource_brand} label="品牌" />
              <Check checked={r.resource_experience} label="經驗" />
            </div>
            <Field label="其他資源" value={r.resource_other_text} />
          </div>
          <div>
            <p className="text-xs text-gold font-medium">PART 2 戰場選擇</p>
            <Field label="目前領域" value={r.current_field} />
            <Field label="切入市場" value={r.target_market} />
            <Field label="聚焦戰場" value={r.focused_battlefield} />
          </div>
          <div>
            <p className="text-xs text-gold font-medium">PART 3 機會判斷</p>
            <Field label="市場趨勢" value={r.market_trend} />
            <Field label="3年機會" value={r.three_year_opportunity} />
            <Field label="AI/技術紅利" value={r.ai_tech_dividend} />
          </div>
          <div>
            <p className="text-xs text-gold font-medium">PART 4 個人定位</p>
            <Field label="我是誰" value={r.who_am_i} />
            <Field label="幫助誰" value={r.who_to_help} />
            <Field label="解決什麼問題" value={r.what_problem} />
            <Field label="定位一句話" value={r.positioning_statement} />
          </div>
          {/* QBC AI Agent 互動流程 */}
          {r.step1_success_three && (
            <div>
              <p className="text-xs text-gold font-medium">STEP 1 優勢挖掘</p>
              <Field label="最成功的三件事" value={r.step1_success_three} />
              <Field label="被稱讚的能力" value={r.step1_praised_ability} />
              <Field label="最不費力的事" value={r.step1_effortless} />
              <Field label="AI 回覆" value={r.step1_ai_response} />
            </div>
          )}
          {r.step2_value_conversion && (
            <div>
              <p className="text-xs text-gold font-medium">STEP 2 能力轉換</p>
              <Field label="能力變成什麼價值" value={r.step2_value_conversion} />
              <Field label="解決誰的問題" value={r.step2_solve_problem} />
              <Field label="變現方式" value={r.step2_monetize_ways} />
              <Field label="AI 回覆" value={r.step2_ai_response} />
            </div>
          )}
          {r.step3_target_people && (
            <div>
              <p className="text-xs text-gold font-medium">STEP 3 戰場建議</p>
              <Field label="服務哪群人" value={r.step3_target_people} />
              <Field label="進入哪個產業" value={r.step3_target_industry} />
              <Field label="B2B / B2C" value={r.step3_b2b_or_b2c} />
              <Field label="AI 回覆" value={r.step3_ai_response} />
            </div>
          )}
          {r.step4_current_trend && (
            <div>
              <p className="text-xs text-gold font-medium">STEP 4 機會分析</p>
              <Field label="現在趨勢" value={r.step4_current_trend} />
              <Field label="AI 放大" value={r.step4_ai_amplify} />
              <Field label="3年成長" value={r.step4_growth_3year} />
              <Field label="AI 回覆" value={r.step4_ai_response} />
            </div>
          )}
          {r.result_battlefield && (
            <div>
              <p className="text-xs text-gold font-medium">戰略定位結果</p>
              <Field label="戰場一句話" value={r.result_battlefield} />
              <Field label="定位一句話" value={r.result_positioning} />
              <Field label="優勢一句話" value={r.result_advantage} />
              <Field label="第一步行動" value={r.result_first_action} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
