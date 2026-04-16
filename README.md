# 👑 Crown Coffee Inventory and Stock Management

A premium, full-stack inventory and stock management system tailored for Crown Coffee. Built with Next.js 14, Supabase, and integrated with Claude AI for smart document scanning.

## ✨ Premium Features
- **AI Document Scanning** — integrated with Anthropic Claude to scan handwritten bazar lists and sales records automatically.
- **Smart Menu & Recipes** — manage menu items with precise ingredient recipes and automatic stock deduction.
- **Dynamic Bazar Logging** — track daily purchases with real-time stock updates and cost analysis.
- **Intelligent Sales** — record sales with manual price overrides and automatic inventory subtraction via recipes.
- **Live Inventory Shield** — mobile-responsive stock view with low-stock alerts and manual adjustment logging.
- **Enhanced Security** — robust error handling and environment variable transparency for development.

---

## 🛠 Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **AI Engine**: Anthropic Claude 3.5 Sonnet
- **Styling**: Vanilla CSS (Cafe-inspired Palette: Deep Brown, Cream, Gold)
- **Icons**: Lucide React

---

## 🚀 Setup Guide

### 1. Database Setup
1. Create a new project on [Supabase](https://supabase.com).
2. Run the `supabase-schema.sql` in the Supabase SQL Editor to initialize tables and triggers.
3. Disable RLS (Row Level Security) for initial development or configure policies for production.

### 2. Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. Installation
```bash
npm install
npm run dev
```

---

## 👨‍💻 Development Features
- **EnvCheck Banner**: A prominent warning banner appears in development mode if Supabase keys are missing.
- **Robust Error Handling**: Standardized error reporting across all data-entry forms using custom toast notifications and console logging.
- **Mobile First**: Fully responsive design optimized for iPads and tablets used in-store.

---

## 📖 How to Use
1. **Setup Menu**: Add ingredients (e.g., Coffee Beans) first, then create menu items (e.g., Cortado) and attach recipes.
2. **Scan or Log**: Use the **AI Scanner** to upload a photo of your handwritten records, or enter data manually.
3. **Analyze**: Check the Dashboard (coming soon) or Stock pages to see your profit and inventory health.

---

*Branded for Crown Coffee. No emojis were used in the making of this premium interface.*
