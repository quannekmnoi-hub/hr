-- ============================================================
-- schema.sql — HR Candidate Manager · Single Source of Truth
-- Cập nhật file này khi cần thay đổi schema, không tạo file mới
-- Paste toàn bộ vào Supabase SQL Editor và chạy lại
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- TABLES
-- ============================================================

-- Candidates
CREATE TABLE IF NOT EXISTS public.candidates (
  id               UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name        TEXT        NOT NULL,
  email            TEXT,
  phone            TEXT,
  gender           TEXT        CHECK (gender IN ('Nam', 'Nữ', 'Khác')),
  date_of_birth    DATE,
  location         TEXT,
  linkedin_url     TEXT,
  portfolio_url    TEXT,
  applied_position TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'New'
                               CHECK (status IN ('New', 'Interviewing', 'Hired', 'Rejected')),
  resume_url       TEXT,
  skills           JSONB       DEFAULT '[]'::JSONB,
  notes            TEXT,
  matching_score   NUMERIC(5,2) DEFAULT 0,
  ai_analysis      JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Thêm cột mới nếu chưa có (safe migration cho DB đã tồn tại)
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS gender        TEXT CHECK (gender IN ('Nam', 'Nữ', 'Khác'));
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Jobs
CREATE TABLE IF NOT EXISTS public.jobs (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  description  TEXT,
  requirements JSONB,
  ai_summary   TEXT,
  jd_url       TEXT,
  status       TEXT        DEFAULT 'Open',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Thêm cột jd_url an toàn cho DB đã tồn tại
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS jd_url TEXT;

-- Job Requirements (dùng cho matching score algorithm)
CREATE TABLE IF NOT EXISTS public.job_requirements (
  id              UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  position_name   TEXT        NOT NULL UNIQUE,
  required_skills JSONB       DEFAULT '[]'::JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);


-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS candidates_user_id_idx    ON public.candidates(user_id);
CREATE INDEX IF NOT EXISTS candidates_created_at_idx ON public.candidates(created_at DESC);
CREATE INDEX IF NOT EXISTS candidates_status_idx     ON public.candidates(status);
CREATE INDEX IF NOT EXISTS candidates_position_idx   ON public.candidates(applied_position);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.candidates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_requirements ENABLE ROW LEVEL SECURITY;

-- Candidates
DROP POLICY IF EXISTS "Users can view own candidates" ON public.candidates;
CREATE POLICY "Users can view own candidates"
  ON public.candidates FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own candidates" ON public.candidates;
CREATE POLICY "Users can insert own candidates"
  ON public.candidates FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own candidates" ON public.candidates;
CREATE POLICY "Users can update own candidates"
  ON public.candidates FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own candidates" ON public.candidates;
CREATE POLICY "Users can delete own candidates"
  ON public.candidates FOR DELETE USING (auth.uid() = user_id);

-- Jobs
DROP POLICY IF EXISTS "Users can view own jobs" ON public.jobs;
CREATE POLICY "Users can view own jobs"
  ON public.jobs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own jobs" ON public.jobs;
CREATE POLICY "Users can insert own jobs"
  ON public.jobs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own jobs" ON public.jobs;
CREATE POLICY "Users can update own jobs"
  ON public.jobs FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own jobs" ON public.jobs;
CREATE POLICY "Users can delete own jobs"
  ON public.jobs FOR DELETE USING (auth.uid() = user_id);

-- Job Requirements
DROP POLICY IF EXISTS "Authenticated users can view job requirements" ON public.job_requirements;
CREATE POLICY "Authenticated users can view job requirements"
  ON public.job_requirements FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage job requirements" ON public.job_requirements;
CREATE POLICY "Authenticated users can manage job requirements"
  ON public.job_requirements FOR ALL USING (auth.role() = 'authenticated');


-- ============================================================
-- STORAGE
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
  VALUES ('resumes', 'resumes', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload resumes" ON storage.objects;
CREATE POLICY "Authenticated users can upload resumes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes');

DROP POLICY IF EXISTS "Public can view resumes" ON storage.objects;
CREATE POLICY "Public can view resumes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resumes');

DROP POLICY IF EXISTS "Users can delete own resumes" ON storage.objects;
CREATE POLICY "Users can delete own resumes"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resumes');

DROP POLICY IF EXISTS "Users can update own resumes" ON storage.objects;
CREATE POLICY "Users can update own resumes"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resumes');


-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_candidates_updated_at ON public.candidates;
CREATE TRIGGER handle_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_jobs_updated_at ON public.jobs;
CREATE TRIGGER handle_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- SEED: Job Requirements (cho matching score algorithm)
-- ============================================================
INSERT INTO public.job_requirements (position_name, required_skills) VALUES
  ('Frontend Developer',  '["React","TypeScript","CSS","HTML","JavaScript","Next.js","Vite"]'),
  ('Backend Developer',   '["Node.js","PostgreSQL","REST API","Docker","TypeScript","SQL","Express"]'),
  ('Fullstack Developer', '["React","Node.js","PostgreSQL","TypeScript","REST API","Docker","Git"]'),
  ('UI/UX Designer',      '["Figma","Sketch","Adobe XD","Prototyping","User Research","CSS","HTML"]'),
  ('DevOps Engineer',     '["Docker","Kubernetes","CI/CD","AWS","Linux","Terraform","Bash"]'),
  ('Data Engineer',       '["Python","SQL","Spark","Airflow","PostgreSQL","ETL","Pandas"]'),
  ('Mobile Developer',    '["React Native","Flutter","iOS","Android","TypeScript","Dart","Swift"]'),
  ('QA Engineer',         '["Selenium","Jest","Cypress","Manual Testing","API Testing","Postman"]')
ON CONFLICT (position_name) DO NOTHING;
