-- course-system.sql — 模組八 線上課程影片系統 Phase 1
-- 在 Supabase Studio SQL Editor 執行。可重複執行（IF NOT EXISTS / DROP POLICY IF EXISTS）。
-- 對應 SPEC：docs/SPEC_模組八_線上課程影片系統.md

-- ── profiles：批次匯入未註冊者建帳號用（首登強制改密碼，Phase 3 才用，先把欄位備好）
alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

-- ── 1) 課程
create table if not exists public.courses (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  summary      text,
  cover_url    text,
  is_published boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

-- ── 2) 單元（影片）
create table if not exists public.course_lessons (
  id             uuid primary key default gen_random_uuid(),
  course_id      uuid not null references public.courses(id) on delete cascade,
  sort_order     int not null default 0,
  title          text not null,
  video_provider text not null default 'youtube' check (video_provider in ('youtube','vimeo')),
  video_id       text not null,
  video_hash     text,
  duration_sec   int,
  is_preview     boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists idx_course_lessons_course on public.course_lessons(course_id, sort_order);

-- ── 3) 課程 ↔ 方案（分級解鎖）
create table if not exists public.course_plan_access (
  course_id uuid not null references public.courses(id) on delete cascade,
  plan      text not null check (plan in ('trial','monthly','annual')),
  primary key (course_id, plan)
);

-- ── 4) 觀看進度（Phase 4 用，先把表備好）
create table if not exists public.lesson_progress (
  user_id           uuid not null references public.profiles(id) on delete cascade,
  lesson_id         uuid not null references public.course_lessons(id) on delete cascade,
  last_position_sec int not null default 0,
  completed_at      timestamptz,
  updated_at        timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ── 5) 手動 / 批次開通授權（與訂閱並存的第二授權來源）
create table if not exists public.course_enrollments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  course_id  uuid not null references public.courses(id) on delete cascade,
  source     text not null default 'manual_import' check (source in ('manual_import','admin_grant','purchase')),
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  unique (user_id, course_id)
);
create index if not exists idx_course_enrollments_user on public.course_enrollments(user_id);

-- ── RLS
alter table public.courses            enable row level security;
alter table public.course_lessons     enable row level security;
alter table public.course_plan_access enable row level security;
alter table public.lesson_progress    enable row level security;
alter table public.course_enrollments enable row level security;

-- 寫入（insert/update/delete）一律走 service role（繞 RLS），故此處只開 select 政策。

-- courses：已上架者已登入可讀；admin/master 全部
drop policy if exists "courses read" on public.courses;
create policy "courses read" on public.courses for select
  using (
    is_published = true
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','master'))
  );

-- course_lessons：所屬課程已上架可讀；admin/master 全部
drop policy if exists "lessons read" on public.course_lessons;
create policy "lessons read" on public.course_lessons for select
  using (
    exists (select 1 from public.courses c where c.id = course_id and c.is_published = true)
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','master'))
  );

-- course_plan_access：已登入可讀
drop policy if exists "plan_access read" on public.course_plan_access;
create policy "plan_access read" on public.course_plan_access for select
  using (auth.uid() is not null);

-- lesson_progress：只能讀寫自己
drop policy if exists "progress own" on public.lesson_progress;
create policy "progress own" on public.lesson_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- course_enrollments：讀自己；admin/master 全部
drop policy if exists "enrollments read" on public.course_enrollments;
create policy "enrollments read" on public.course_enrollments for select
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','master'))
  );

-- ── 驗證
select
  (select count(*) from information_schema.tables
     where table_schema = 'public'
       and table_name in ('courses','course_lessons','course_plan_access','lesson_progress','course_enrollments')
  ) as new_tables_count,   -- 應為 5
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'profiles' and column_name = 'must_change_password'
  ) as has_must_change_password;  -- 應為 1
