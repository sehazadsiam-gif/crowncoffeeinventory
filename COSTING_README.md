# Crown Coffee — Menu Costing & Profitability Module

> Routes: `ccadmin.online/menu-costings` (Chef) · `ccadmin.online/admin/menu-engineering` (Admin)

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Setup](#database-setup)
3. [Environment Variables](#environment-variables)
4. [Creating the First Admin User](#creating-the-first-admin-user)
5. [Deployment on Vercel](#deployment-on-vercel)
6. [Custom Domain — ccadmin.online](#custom-domain--ccadminonline)
7. [Feature Reference](#feature-reference)
8. [Unit Conversion Logic](#unit-conversion-logic)

---

## Architecture Overview

```
cafe-inventory/
├── app/
│   ├── menu-costings/          # Chef route
│   │   ├── login/page.js       # Shared login (chef + admin)
│   │   ├── page.js             # Server guard → MenuCostingsClient
│   │   └── MenuCostingsClient.js
│   ├── admin/
│   │   └── menu-engineering/   # Admin route
│   │       ├── page.js         # Server guard → MenuEngineeringClient
│   │       ├── MenuEngineeringClient.js
│   │       ├── SectionA.js     # Items & Pricing
│   │       ├── SectionB.js     # Monthly Sales & Classification
│   │       ├── SectionC.js     # Business Profitability
│   │       ├── ScatterChart.js # SVG 2×2 scatter chart
│   │       ├── TrendChart.js   # SVG CM vs Fixed Costs trend
│   │       └── ExportButton.js # CSV + PDF export
│   └── api/
│       ├── costing/auth/login/    # POST login, DELETE logout, GET session
│       ├── costing/auth/setup/    # POST create user (admin or setup key)
│       ├── costing/menu-items/    # GET/POST/PATCH
│       ├── costing/ingredients/   # GET/POST
│       ├── costing/item-ingredients/  # GET/POST (with COGS calc)
│       ├── costing/bulk-update/   # PATCH bulk ingredient price
│       ├── costing/cogs-history/  # GET version history
│       ├── admin/pricing/         # GET/POST dine-in + channel pricing
│       ├── admin/channels/        # GET/POST/PATCH/DELETE
│       ├── admin/sales/           # GET/POST/DELETE monthly sales
│       └── admin/fixed-costs/     # GET/POST monthly overhead
├── lib/
│   ├── costing-auth.js           # Session management, login, cookies
│   └── costing-calculations.js   # Unit conversion, COGS, margins, classification
├── menu-costings-schema.sql      # Run this in Supabase SQL Editor
└── middleware.js                 # Route protection (cookie presence check)
```

**Auth model:** Custom session cookies (`cc_costing_token`). Passwords bcrypt-hashed. Sessions expire after 7 days.

**Tables:** All prefixed `costing_` — no conflict with existing inventory schema.

---

## Database Setup

1. Open your **Supabase project** → SQL Editor
2. Paste and run the entire contents of **`menu-costings-schema.sql`**

This creates 11 new tables (all `costing_` prefixed) and seeds the default delivery channels (Foodpanda, Pathao Food, Own Delivery).

---

## Environment Variables

Add to `.env.local` (dev) and Vercel Project Settings (prod):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
COSTING_SETUP_KEY=your-strong-random-string
```

Generate a setup key:
```bash
openssl rand -hex 32
```

---

## Creating the First Admin User

After deploying, make a single `POST` request to create your first admin:

```bash
curl -X POST https://www.ccadmin.online/api/costing/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email":    "admin@crowncoffee.com",
    "password": "YourSecurePassword123!",
    "name":     "Admin",
    "role":     "admin",
    "setupKey": "your-COSTING_SETUP_KEY-value"
  }'
```

To add a chef user (requires existing admin session cookie):
```bash
curl -X POST https://www.ccadmin.online/api/costing/auth/setup \
  -H "Content-Type: application/json" \
  -H "Cookie: cc_costing_token=<admin-token>" \
  -d '{
    "email":    "chef@crowncoffee.com",
    "password": "ChefPass456!",
    "name":     "Head Chef",
    "role":     "chef"
  }'
```

---

## Deployment on Vercel

### Step 1 — Push to GitHub
```bash
git add .
git commit -m "feat: add menu costing and profitability module"
git push
```

### Step 2 — Import on Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your repository
3. Framework: **Next.js** (auto-detected)
4. Add environment variables (see above)
5. Click **Deploy**

### Step 3 — Verify
Visit `https://<your-vercel-url>/menu-costings/login` and sign in.

---

## Custom Domain — ccadmin.online

### Step 1 — Add domain in Vercel
1. Go to your Vercel project → **Settings → Domains**
2. Add `ccadmin.online` and `www.ccadmin.online`
3. Vercel will show you the DNS records to configure

### Step 2 — Configure DNS
In your domain registrar's DNS settings:

| Type  | Name | Value                        |
|-------|------|------------------------------|
| A     | @    | `76.76.21.21`                |
| CNAME | www  | `cname.vercel-dns.com`       |

> DNS propagation can take 15 minutes–48 hours.

### Step 3 — SSL
Vercel automatically provisions a free SSL certificate via Let's Encrypt once DNS propagates.

### Step 4 — Verify
```
https://ccadmin.online/menu-costings/login   → Chef + Admin login
https://ccadmin.online/menu-costings         → Chef costing UI
https://ccadmin.online/admin/menu-engineering → Admin dashboard
```

---

## Feature Reference

### `/menu-costings` — Chef Area
| Feature | Description |
|---|---|
| Item selector | Sidebar with all items, live search |
| Ingredient row builder | Unlimited rows; autocomplete names from master list |
| Unit conversion | g↔kg, ml↔L, piece, bottle — all combinations supported |
| Live COGS | Shows total cost of goods as you type — **no selling price** |
| COGS history | Every save stores a timestamped snapshot with ingredient breakdown |
| Bulk price update | Update one ingredient's price across ALL items at once |

### `/admin/menu-engineering` — Admin Area

**Section A — Items & Pricing**
- Read-only COGS from chef inputs
- Dine-in price input
- Per-channel price + commission % (configurable channels)
- Live: CM, Food Cost %, Net Margin After Commission, Net FC%
- Color coding: green <25%, yellow 25–35%, red >35%
- Losing Money Online alert (configurable threshold)

**Section B — Monthly Sales & Classification**
- Month/year picker (shared across A/B/C)
- Manual quantity entry per item
- CSV import (format: `Item Name,Quantity Sold`)
- Per-item: Revenue, COGS Used, CM Generated, Popularity %
- 4-quadrant classification using current month's own medians
- 2×2 SVG scatter chart with labeled dots
- Recommended actions per category
- Export as CSV / PDF

**Section C — Business Profitability**
- Prominent Net Profit/Loss banner (green/red)
- Fixed costs: Rent, Salaries, Utilities, Other (editable per month)
- Auto-calc: Total CM, Break-Even Revenue, CM Ratio
- 6–12 month SVG trend chart (CM vs Fixed Costs)
- Export as CSV / PDF

---

## Unit Conversion Logic

The system normalises price to match the quantity unit before calculating:

```
line_cost = quantity × (price × conversion_factor)

Conversions:
  qty=g,  price=per kg  → factor = 0.001  (price ÷ 1000 → price/g)
  qty=kg, price=per g   → factor = 1000   (price × 1000 → price/kg)
  qty=ml, price=per L   → factor = 0.001
  qty=L,  price=per ml  → factor = 1000
  piece / bottle        → factor = 1 (no conversion)
```

**Example:** 200g of espresso beans at ৳800/kg
```
factor     = 0.001
price/g    = 800 × 0.001 = 0.80 ৳/g
line_cost  = 200 × 0.80  = ৳160
```

---

## Currency

All monetary values displayed in **BDT (৳)**. No currency conversion is performed.
