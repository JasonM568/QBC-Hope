-- 教練特例補填區間（2026-09-25 上線）
-- 兩個欄位都有值才生效：截止日（含）之前，可補填 backfill_from～今天 之間任一天的日報。
-- 過期後自動回到只能填昨天/今天/明天，不需要再清掉欄位。
alter table public.profiles
  add column if not exists backfill_from date,
  add column if not exists backfill_until date;
comment on column public.profiles.backfill_from is '教練特例：可補填日報的最早日期（與 backfill_until 一起設才生效）';
comment on column public.profiles.backfill_until is '教練特例：補填截止日（含當天），過期後回到只能填昨天/今天/明天';

-- 開特例範例：
-- update profiles set backfill_from = '2026-09-20', backfill_until = '2026-09-28' where email = 'xxx@example.com';
