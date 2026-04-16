# HR Candidate Manager

Ứng dụng web quản lý hồ sơ ứng viên dành cho bộ phận HR, xây dựng bằng **React + TypeScript + Vite** và **Supabase** (Auth, Database, Edge Functions, Storage, Realtime).

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend & Database**: Supabase (PostgreSQL + RLS)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (bucket `resumes`)
- **Realtime**: Supabase Postgres Changes
- **Edge Functions**: Deno (add-candidate, analytics)
- **Icons**: Lucide React
- **Design**: Neumorphism UI

---

## Cấu trúc Dự án

```
├── candidate-manager/        # React + TypeScript + Vite app
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/         # Login / Register
│   │   │   └── Dashboard/    # Header, Stats, Filter, Candidate list/card, Modal
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useCandidates.ts   # Algorithms 1, 3, 4
│   │   │   ├── useRealtime.ts
│   │   │   └── useAnalytics.ts    # Algorithm 2
│   │   ├── lib/supabase.ts
│   │   └── types/index.ts
│   └── .env.example
└── supabase/
    ├── migrations/001_init.sql    # Schema, RLS, Storage, Seed
    └── functions/
        ├── add-candidate/         # Edge Function (Algorithm 5: Matching Score)
        └── analytics/             # Edge Function (aggregate stats)
```

---

## Thuật toán Triển khai

| # | Thuật toán | Nơi triển khai |
|---|-----------|----------------|
| 1 | Fuzzy Search (Levenshtein) + Multi-filter + Smart Sort | `useCandidates.ts` (client) |
| 2 | Analytics / Aggregate Stats | `useAnalytics.ts` + Edge Function `/analytics` |
| 3 | Parallel Upload với Semaphore N=3 | `useCandidates.ts` → `uploadFilesWithConcurrency` |
| 4 | Cursor-based Pagination (không dùng offset) | `useCandidates.ts` |
| 5 | Matching Score = (trùng / tổng yêu cầu) × 100 | `AddCandidateModal.tsx` + Edge Function `add-candidate` |

---

## Cài đặt & Chạy

```bash
# 1. Chạy SQL migration trên Supabase Dashboard > SQL Editor
#    File: supabase/migrations/001_init.sql

# 2. Tạo file .env
cd candidate-manager
cp .env.example .env
# Điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY

# 3. Cài dependencies và chạy
npm install
npm run dev
```

---

## Supabase Setup

### Database Tables
- `candidates` — hồ sơ ứng viên với RLS (user chỉ CRUD record của mình)
- `job_requirements` — yêu cầu kỹ năng cho từng vị trí (dùng để tính matching score)

### Storage
- Bucket `resumes` (public read, authenticated write)

### Deploy Edge Functions
```bash
supabase login
supabase link --project-ref <project-ref>
supabase functions deploy add-candidate
supabase functions deploy analytics
```

---

## Tính năng

- **Đăng nhập / Đăng ký** — Supabase Auth
- **Dashboard** — Stats panel, danh sách ứng viên
- **Thêm ứng viên** — Form + upload CV (PDF/Word/Ảnh)
- **Cập nhật trạng thái** — New → Interviewing → Hired / Rejected
- **Xóa ứng viên**
- **Tìm kiếm fuzzy** theo tên, vị trí, kỹ năng
- **Lọc đa tiêu chí** — trạng thái, vị trí, khoảng ngày
- **Sắp xếp** — theo ngày, tên, matching score
- **Realtime** — cập nhật tức thì khi có thay đổi từ tab khác
- **Matching Score** — điểm phù hợp kỹ năng ứng viên vs yêu cầu vị trí
- **Phân trang** cursor-based (không dùng offset)
- **Upload song song** tối đa 3 file cùng lúc (semaphore)
