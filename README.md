# ☕ Cafe Inventory System

A full-stack inventory and stock management app for your cafe. Built with Next.js + Supabase, deployable on Vercel.

## Features
- **Menu & Recipes** — Add menu items with ingredients and quantities per serving
- **Daily Bazar** — Log daily purchases, track cost per item
- **Sales Logging** — Enter items sold; stock auto-deducted based on recipes
- **Stock View** — Live inventory levels, low stock alerts, manual adjustments, waste logging
- **Dashboard** — Daily revenue, bazar cost, net profit, low stock alerts

---

## Tech Stack
| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (React) |
| Database | Supabase (PostgreSQL) |
| Styling | Tailwind CSS |
| Hosting | Vercel |

---

## Setup Guide (Step by Step)

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) → Sign up (free)
2. Click **New Project** → give it a name like `cafe-inventory`
3. Wait for it to provision (~1 min)
4. Go to **SQL Editor** (left sidebar)
5. Paste the entire contents of `supabase-schema.sql` and click **Run**
6. Go to **Settings → API** → copy:
   - `Project URL` (looks like `https://xxxx.supabase.co`)
   - `anon public` key

### Step 2: Configure Environment Variables
1. Copy `.env.example` to `.env.local`:
   ```
   cp .env.example .env.local
   ```
2. Open `.env.local` and paste your Supabase URL and key

### Step 3: Run Locally
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### Step 4: Deploy to Vercel
1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → Import your repo
3. During setup, add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your anon key
4. Click Deploy ✅

---

## How to Use

### First Time Setup
1. Go to **Menu** → Add your ingredients first (e.g. Espresso Beans - gm)
2. Then add menu items (e.g. Cappuccino - ৳220)
3. Click on a menu item to expand and add its recipe (ingredients + quantity per serving)

### Daily Workflow
| Time | Action |
|---|---|
| Morning | Go to **Bazar** → Log today's purchases |
| During day | Go to **Sales** → Enter quantities sold |
| Anytime | Check **Stock** → See live levels, log waste |
| End of day | Check **Dashboard** → See revenue vs cost |

---

## Database Schema (simplified)
```
ingredients → stores all raw materials with stock levels
menu_items  → your cafe menu with prices
recipes     → links menu items to ingredients with quantities
bazar_entries → daily purchases (auto-adds to stock)
sales         → daily sales (auto-deducts stock via recipes)
stock_movements → audit log of every stock change
```

---

## Customization Tips
- Change the currency symbol `৳` to your own in the JSX files
- Add more categories in `menu/page.js` → `categories` array
- Adjust the "low stock alert" threshold per ingredient in the Stock page
