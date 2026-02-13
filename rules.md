# AI Rules for this Repo (Cursor + Claude)

## Supabase / Database Rules
- Never run ad-hoc SQL in the Supabase dashboard for schema changes.
- All schema changes MUST go through Supabase migrations:
  1) `npx supabase migration new <name>`
  2) edit the new file in `supabase/migrations/`
  3) `npx supabase db push`
- Commit migrations to git.
- Do NOT put `SUPABASE_SECRET_KEY` / service role key in client-side code.
- Use the publishable key only for browser/client code.

## Safety
- If a change is destructive (drop table/column), create a backup/plan and call it out in the migration comments.
