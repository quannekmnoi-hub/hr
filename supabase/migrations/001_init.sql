-- ============================================
-- 001_init.sql - HR Candidate Manager Schema
-- ============================================

-- Enable extensions
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Candidates table
create table if not exists public.candidates (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  full_name     text not null,
  applied_position text not null,
  status        text not null default 'New'
                  check (status in ('New', 'Interviewing', 'Hired', 'Rejected')),
  resume_url    text,
  skills        jsonb default '[]'::jsonb,
  notes         text,
  matching_score numeric(5,2) default 0,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

-- Job requirements table (for matching score algorithm)
create table if not exists public.job_requirements (
  id             uuid default uuid_generate_v4() primary key,
  position_name  text not null unique,
  required_skills jsonb default '[]'::jsonb,
  created_at     timestamptz default now() not null
);

-- ============================================
-- INDEXES
-- ============================================
create index if not exists candidates_user_id_idx        on public.candidates(user_id);
create index if not exists candidates_created_at_idx     on public.candidates(created_at desc);
create index if not exists candidates_status_idx         on public.candidates(status);
create index if not exists candidates_position_idx       on public.candidates(applied_position);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
alter table public.candidates     enable row level security;
alter table public.job_requirements enable row level security;

-- Candidates: each user only sees/modifies their own records
create policy "Users can view own candidates"
  on public.candidates for select
  using (auth.uid() = user_id);

create policy "Users can insert own candidates"
  on public.candidates for insert
  with check (auth.uid() = user_id);

create policy "Users can update own candidates"
  on public.candidates for update
  using (auth.uid() = user_id);

create policy "Users can delete own candidates"
  on public.candidates for delete
  using (auth.uid() = user_id);

-- Job Requirements: readable by all authenticated users
create policy "Authenticated users can view job requirements"
  on public.job_requirements for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can manage job requirements"
  on public.job_requirements for all
  using (auth.role() = 'authenticated');

-- ============================================
-- STORAGE
-- ============================================
insert into storage.buckets (id, name, public)
  values ('resumes', 'resumes', true)
  on conflict (id) do nothing;

create policy "Authenticated users can upload resumes"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'resumes');

create policy "Public can view resumes"
  on storage.objects for select
  using (bucket_id = 'resumes');

create policy "Users can delete own resumes"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'resumes');

create policy "Users can update own resumes"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'resumes');

-- ============================================
-- TRIGGER: auto-update updated_at
-- ============================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger handle_candidates_updated_at
  before update on public.candidates
  for each row execute function public.handle_updated_at();

-- ============================================
-- SEED: Job Requirements (for matching score)
-- ============================================
insert into public.job_requirements (position_name, required_skills) values
  ('Frontend Developer',  '["React","TypeScript","CSS","HTML","JavaScript","Next.js","Vite"]'),
  ('Backend Developer',   '["Node.js","PostgreSQL","REST API","Docker","TypeScript","SQL","Express"]'),
  ('Fullstack Developer', '["React","Node.js","PostgreSQL","TypeScript","REST API","Docker","Git"]'),
  ('UI/UX Designer',      '["Figma","Sketch","Adobe XD","Prototyping","User Research","CSS","HTML"]'),
  ('DevOps Engineer',     '["Docker","Kubernetes","CI/CD","AWS","Linux","Terraform","Bash"]'),
  ('Data Engineer',       '["Python","SQL","Spark","Airflow","PostgreSQL","ETL","Pandas"]'),
  ('Mobile Developer',    '["React Native","Flutter","iOS","Android","TypeScript","Dart","Swift"]'),
  ('QA Engineer',         '["Selenium","Jest","Cypress","Manual Testing","API Testing","Postman"]')
on conflict (position_name) do nothing;
