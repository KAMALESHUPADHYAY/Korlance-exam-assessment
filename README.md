# KORLANCE Assessment Portal

A production-ready, AI-proctored online technical placement assessment platform built for **Korlance (Hyderabad & Bengaluru)**.

## Features

- **Korlance Brand & Theme**: Deep dark navy-violet gradient (`#0B0614` → `#1A0B3B`), primary purple (`#7C3AED`), lavender accents (`#C4B5FD`), custom stylized SVG "K" logo + wordmark, glassmorphism cards, and `Plus Jakarta Sans` / `Inter` typography.
- **Student Flow**:
  - **Login Page (`/`)**: Full Name, Gmail/Email validation, College Name, searchable **Select Your Domain / Program** dropdown across **16 domains**, and strict one-attempt-per-email enforcement (`MAX_ATTEMPTS_PER_EMAIL`).
  - **2-Page Student Dashboard (`/dashboard`)**:
    - *Page 1*: Korlance motivation hero (`Build / Practical capability / Create portfolio evidence / Lead tomorrow`), 6-second rotating motivational quote strip, personalized welcome (`Welcome, <Name> | <Domain> Assessment`), exam details (`30 MCQs`, `30 Minutes`, `+1/0` marking), all **16 domain cards** with selected domain highlighted, and leadership signature card (**Hari Kumar, CEO, Korlance**).
    - *Page 2*: Proctoring rules & regulations with icons, mandatory live webcam permission check (blocks **Start Exam** if denied or unsupported), configurable violation policy notice, and mandatory agreement checkbox.
  - **AI-Proctored Exam Page (`/exam`)**:
    - **480 unique MCQs** stored in modular per-domain JSON files (`/prisma/seed/questions/<domain>.json`, 30 questions per domain: 10 Easy, 14 Medium, 6 Hard). Each student receives ONLY the 30 questions of their selected domain, shuffled per student (both question order and option order).
    - Correct answers stored exclusively on the server (never exposed to client payloads).
    - Question palette (Answered, Marked for Review, Not Answered), server-synced **30-minute** (`EXAM_DURATION_MINUTES`) countdown timer, auto-save answers, and auto-submit on expiry.
    - **In-Browser AI Proctoring (`@mediapipe/tasks-vision` FaceLandmarker)**: all face analysis runs privately on the student's device (no video leaves the browser). Detects no face (>5s), multiple faces, sustained looking away (left/right/down), and blocked/dark/off camera.
    - **Periodic & Violation Snapshots**: captures and uploads a JPEG snapshot every 30 seconds and on every violation, stored directly in PostgreSQL (serverless-safe, zero local disk writes).
    - **Focus & Tab Switch Lock**: `visibilitychange`, `window.blur`, and `fullscreenchange` immediately stop the camera stream, lock the exam behind a full-screen **Exam Locked** overlay, and log the violation. 1st violation allows one-time resume with camera restart; reaching `MAX_ALLOWED_VIOLATIONS` (default `2`) triggers automatic submission (`Auto-Submitted (Violation)`).
  - **Submission Confirmation (`/submitted`)**: Thank-you page (score hidden unless enabled by Admin) + branded HTML confirmation email to the student's Gmail and alert email to `ADMIN_EMAIL` via Nodemailer.
- **Admin Dashboard (`/admin`)**:
  - Protected by env-configured credentials (`ADMIN_USER`, `ADMIN_PASSWORD`).
  - Live polling every 10 seconds with stat cards, domain-wise participation & average score chart across all 16 domains, and status badges (Green = Submitted, Blue = In Progress, Red = Auto-Submitted).
  - Search by name/email/college, filter by status, college, or domain, toggle score visibility on student submission, inspect candidate violation logs with timestamps, view the **Snapshot Gallery** & domain breakdown, reset attempts, and export CSV.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **Database & ORM**: PostgreSQL (Neon) + Prisma ORM
- **AI Proctoring**: `@mediapipe/tasks-vision` (in-browser WebAssembly FaceLandmarker)
- **Email**: Nodemailer (Gmail SMTP)
- **Auth & Security**: HMAC-SHA256 signed `HttpOnly` cookies, server-side timer & scoring, in-memory rate limiting

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon) | `postgresql://user:pass@host/db?sslmode=require` |
| `SESSION_SECRET` | Random secret for signing session cookies | `long-random-64-char-secret` |
| `SMTP_USER` | Gmail address used by Nodemailer | `assessments@gmail.com` |
| `SMTP_PASS` | Gmail App Password (16-char) | `abcd efgh ijkl mnop` |
| `ADMIN_USER` | Admin dashboard login username | `korlance_admin` |
| `ADMIN_PASSWORD` | Admin dashboard login password | `StrongAdminPass@2026` |
| `ADMIN_EMAIL` | Admin email to receive submission alerts | `admin@korlance.com` |
| `MAX_ALLOWED_VIOLATIONS` | Violations allowed before auto-submit (default `2`) | `2` |
| `EXAM_DURATION_MINUTES` | Exam duration in minutes (default `30`) | `30` |
| `MAX_ATTEMPTS_PER_EMAIL` | Maximum attempts per candidate email (default `1`) | `1` |
| `NEXT_PUBLIC_SHOW_SCORE_ON_SUBMIT` | Default score visibility (`"false"` or `"true"`) | `false` |

> **Gmail SMTP Note**: Enable 2-Step Verification on the Gmail account and generate an **App Password** under Google Account → Security → App Passwords for `SMTP_PASS`.

---

## Local Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure `.env`** with your PostgreSQL `DATABASE_URL` and SMTP/Admin credentials.

3. **Push schema to database & seed 480 MCQs**:
   ```bash
   npx prisma db push
   npm run db:seed
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) for the student portal and [http://localhost:3000/admin](http://localhost:3000/admin) for the admin dashboard.

---

## Production Deployment (Neon + Vercel)

1. **Create a Neon PostgreSQL database** at [neon.tech](https://neon.tech) and copy the pooled/direct `DATABASE_URL`.
2. **Push schema & seed production database**:
   ```bash
   npx prisma db push
   npm run db:seed
   ```
3. **Deploy to Vercel**:
   - Connect your GitHub repository (`Korlance-exam-assessment`) in Vercel or run `vercel --prod`.
   - Set all environment variables from `.env.example` in Vercel (`DATABASE_URL`, `SESSION_SECRET`, `SMTP_USER`, `SMTP_PASS`, `ADMIN_USER`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`, `MAX_ALLOWED_VIOLATIONS`, `EXAM_DURATION_MINUTES`, `MAX_ATTEMPTS_PER_EMAIL`, `NEXT_PUBLIC_SHOW_SCORE_ON_SUBMIT`).
   - Build command runs `prisma generate && next build` automatically.

---

Designed & Developed by Kamalesh Upadhyay
