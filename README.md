This is a [Next.js](https://nextjs.org) project for Eco Warehouse - ניהול מחסן אקולוגי

## Setup Instructions

### 1. Initialize Supabase Database

Run all SQL migration files in your Supabase SQL editor in this order:
1. `sql/supabase-schema.sql` - Main schema
2. `sql/migrations/2026-01-08-add-category.sql` - Add category column
3. `sql/migrations/2026-01-08-add-production-tables.sql` - Production tracking
4. `sql/migrations/2026-01-08-add-recipes.sql` - Bill of Materials
5. `sql/migrations/2026-01-08-ensure-category.sql` - Ensure category and fix RLS

### 2. If you get "column category does not exist" errors

This is a Supabase schema cache issue. Try these steps:

**Option A: Refresh Supabase Cache** (Recommended)
- Go to your Supabase project dashboard
- Click "SQL Editor" 
- Run the migration: `sql/migrations/2026-01-08-ensure-category.sql`

**Option B: Restart the application**
- Stop your development server (Ctrl+C)
- Wait 2 minutes
- Run `npm run dev` again

**Option C: Clear browser cache**
- Clear your browser's local storage and cache
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
