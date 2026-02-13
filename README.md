# BIK Media Mortgage Dashboard CRM

A multi-tenant CRM for mortgage brokers with:
- Tenant isolation (brokers only see their own data)
- Admin functionality (create brokers, import CSV leads)
- Broker dashboard, leads table, kanban pipeline, lead detail

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (Auth + Postgres + RLS)
- **Charts**: Recharts
- **Drag & Drop**: @dnd-kit

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLIC_KEY=your-anon-key-here
SUPABASE_SECRET_KEY=your-service-role-key-here
```

You can find these values in your Supabase dashboard:
- Go to **Project Settings** > **API**
- Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Copy the **anon/public** key → `NEXT_PUBLIC_SUPABASE_PUBLIC_KEY`
- Copy the **service_role** key → `SUPABASE_SECRET_KEY`

### 3. Link to Your Supabase Project

```bash
npx supabase login
npx supabase link --project-ref your-project-id
```

### 4. Run Database Migrations

```bash
npm run supabase:db:push
```

This creates the following tables:
- `brokers` - Broker accounts
- `leads` - Customer leads with tenant isolation
- `csv_imports` - Import audit log

### 5. Create an Admin User

In the Supabase dashboard, go to **Authentication** > **Users** and create a new user.
Set the user metadata to: `{ "role": "admin" }`

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Application Structure

```
src/
├── app/
│   ├── (auth)/login/           # Login page
│   ├── (broker)/               # Broker routes (protected)
│   │   ├── dashboard/          # Stats & charts
│   │   ├── leads/              # Leads table & detail
│   │   └── pipeline/           # Kanban board
│   ├── (admin)/                # Admin routes (protected)
│   │   ├── brokers/            # Manage brokers
│   │   └── import/             # CSV import
│   └── api/admin/              # API routes
├── components/
│   ├── ui/                     # shadcn components
│   ├── leads/                  # Lead components
│   ├── dashboard/              # Dashboard components
│   └── layout/                 # Sidebar, Header
└── lib/
    ├── supabase-server.ts      # Server client
    └── supabase-browser.ts     # Browser client
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run supabase:db:push` | Push migrations to Supabase |
| `npm run supabase:gen:types` | Generate TypeScript types |

## Authentication

- **Admin**: Can create broker accounts, import CSV leads
- **Broker**: Can view/edit their own leads, use pipeline

Admins are identified by `user_metadata.role === "admin"`.
Brokers have `user_metadata.role === "broker"`.

## Row Level Security

All tables have RLS enabled:
- Brokers can only see/modify their own leads
- Admin operations use the service role key (server-side only)

## Lead Pipeline Statuses

1. New
2. Contacted
3. Qualified
4. Submitted
5. Approved
6. Settled
7. Lost
