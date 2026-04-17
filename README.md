# The Serene Drops — Deployment Guide

Water refilling station bookkeeping app. Next.js 15 + Supabase + Vercel.
Total setup time: **~30 minutes** if you've never done this before.

---

## Part 1 — Supabase (Database + Auth)

### 1.1 Create the project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it `serene-drops`
3. **Database Password:** Generate a strong one and save it in a password manager. You'll rarely use it, but losing it means resetting the database.
4. **Region:** `Southeast Asia (Singapore)` — lowest latency from Mabalacat.
5. **Pricing Plan:** Free
6. Click **Create new project** and wait ~2 minutes for it to provision.

### 1.2 Run the schema

1. In the left sidebar, click **SQL Editor**
2. Click **+ New query**
3. Open `supabase/schema.sql` from this project and **copy the entire contents**
4. Paste into the SQL Editor and click **Run** (or press Ctrl/Cmd + Enter)
5. You should see `Success. No rows returned.` at the bottom.

### 1.3 Enable email auth

1. Left sidebar → **Authentication** → **Providers**
2. **Email** should already be enabled. Confirm it is.
3. Scroll to find the toggle labeled something like **Confirm email** — if you want magic links to work without a separate confirmation email, you can leave this on the default. Magic links work either way.

### 1.4 Get your API keys

1. Left sidebar → **Project Settings** (gear icon) → **API**
2. Copy two values somewhere safe:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **Project API keys → anon public** (long string starting with `eyJ...`)

---

## Part 2 — Local Setup (Optional but Recommended)

Test the app works on your laptop before deploying.

### 2.1 Install dependencies

You need Node.js 20 or newer. Check with `node -v` in your terminal. If missing, install from [nodejs.org](https://nodejs.org).

```bash
cd serene-drops
npm install
```

### 2.2 Create .env.local

```bash
cp .env.local.example .env.local
```

Open `.env.local` and paste in the values from Supabase step 1.4:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key...
```

### 2.3 Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`. Enter your email, click the magic link that arrives (check spam). You're in.

Log a test sale. If it saves, everything works. Delete the test sale later.

---

## Part 3 — Vercel Deploy

### 3.1 Push to GitHub

1. Create a new repo on GitHub called `serene-drops` (private is fine)
2. In your terminal:

```bash
cd serene-drops
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/serene-drops.git
git push -u origin main
```

### 3.2 Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import** next to your `serene-drops` repo
3. Framework preset will auto-detect as **Next.js** — leave it
4. Expand **Environment Variables** and add both:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
5. Click **Deploy**
6. Wait 1-2 minutes. You'll get a URL like `serene-drops-xxx.vercel.app`.

### 3.3 Tell Supabase about the Vercel URL

Magic links won't redirect correctly until you do this.

1. Back in Supabase → **Authentication** → **URL Configuration**
2. **Site URL:** paste your Vercel URL (e.g. `https://serene-drops-xxx.vercel.app`)
3. **Redirect URLs:** add `https://serene-drops-xxx.vercel.app/auth/callback`
4. If you're also testing locally, add `http://localhost:3000/auth/callback`
5. Save

### 3.4 (Optional) Custom domain

If you own a domain like `serenedrops.ph`:
1. Vercel project → **Settings** → **Domains** → Add domain, follow DNS instructions
2. After it's live, update Supabase Site URL + Redirect URLs to match

---

## Part 4 — Adding Family Members

The app uses magic-link auth. Anyone with an email you approve can sign in.

**For v1 (trusted family only):** Since we don't restrict which emails can sign in, **only share the app URL with family**. Any email that signs up can access and modify everything.

If you want to lock it down to specific emails later, we can add an allowlist. Tell me when you need that.

To add your family:
1. Share the Vercel URL with them
2. They enter their email on the login page
3. They click the magic link in their inbox
4. Done. They can log sales, see everything, same as you.

---

## Part 5 — Install on Phone (Add to Home Screen)

Turns the web app into a phone app. 10 seconds per person.

**iPhone:**
1. Open the URL in Safari
2. Share button → **Add to Home Screen**

**Android:**
1. Open the URL in Chrome
2. Menu (⋮) → **Add to Home screen** or **Install app**

Now it opens full-screen, loads fast, and feels like a native app.

---

## Troubleshooting

**"Email not received"** — check spam folder. Supabase magic link emails often go there on first use. After you mark one as "Not Spam," future ones land in the inbox.

**"Redirected to login after signing in"** — your Site URL in Supabase doesn't match your Vercel URL. Fix Part 3.3.

**"Supabase project paused"** — the free tier pauses after 7 days of zero activity. If you use this daily, it won't happen. If it does, go to Supabase dashboard and click **Restore**.

**"Sale won't save"** — check Supabase → Table Editor → sales table exists. If not, re-run the schema from Part 1.2.

---

## What this app does NOT do (and why)

- **No tax computation** — talk to an accountant
- **No inventory of bottled water stock** — you're a refilling station, not a sari-sari store
- **No staff permissions** — family-only app, everyone has full access
- **No customer-facing ordering** — different product entirely

When any of these become real problems, we add them.

---

## Data Backup

Your data lives in Supabase (cloud Postgres). It's backed up automatically on the paid tier but **not** on the free tier.

**Your backup strategy:** Every month, go to Reports → export CSV. That CSV is your disaster recovery. Keep a folder in Google Drive called `serene-drops-backups`.

If you ever need a deeper backup: Supabase → Database → Backups (paid feature) OR use `pg_dump` from the command line.
