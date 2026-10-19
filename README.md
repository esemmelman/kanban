# Threadboard

A row based progress board. Add an item on the left and append updates across the same row.

Live at <https://esemmelman.github.io/kanban/>.

## Local setup

1. Copy `.env.example` to `.env.local` and add the `bnaimitzvah` Supabase project URL and publishable key.
2. Run `npm install`.
3. Run `npm run dev`.

The database schema is in `supabase/migrations`.

## Archive

Click Archive on the first card in a row to archive the entire sequence, including its updates. Use the Archived tab to view saved sequences and click Restore to return one to the active board. Archive status syncs across devices.

