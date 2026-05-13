-- =============================================
-- 一次性 backfill：補發既有用戶的 4 點簽到禮
--
-- 背景：
--   points-system.sql 部署時，只幫既有用戶建 balance=0 的 row，
--   沒有發 4 點簽到禮（避免 trigger 重複觸發）。
--   這份 backfill 補發給所有「還沒有 signup_bonus 流水」的人。
--
-- 性質：
--   - Idempotent：靠 WHERE NOT EXISTS 過濾，重跑不會多發
--   - 走 grant_points RPC，流水正確、balance_after 快照正確
--   - note 標記為 backfill，未來可區分一般 signup_bonus
-- =============================================

DO $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR r IN
    SELECT p.id, p.email
    FROM profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM point_transactions pt
      WHERE pt.user_id = p.id AND pt.type = 'signup_bonus'
    )
  LOOP
    PERFORM grant_points(
      r.id,
      4,
      'signup_bonus',
      '既有用戶補發簽到禮（backfill）'
    );
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE '補發完成：% 位用戶', v_count;
END $$;

-- =============================================
-- 驗證：跑完後這兩個數字應該相等
-- =============================================
SELECT
  (SELECT COUNT(*) FROM profiles) AS profile_count,
  (SELECT COUNT(DISTINCT user_id)
     FROM point_transactions
     WHERE type = 'signup_bonus') AS signup_bonus_recipient_count;
