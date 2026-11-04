# Threadboard

A row based progress board. Add an item on the left and append updates across the same row.

Live at <https://esemmelman.github.io/kanban/>.

## Local setup

1. Copy `.env.example` to `.env.local` and add the `bnaimitzvah` Supabase project URL and publishable key.
2. Run `npm install`.
3. Run `npm run dev`.

The database schema is in `supabase/migrations`.

## Editing and completion

Click a card to open its rich text editor. Bold, italic, underline, and lists are supported. Changes save automatically after a short pause and when leaving the editor. Use Done to close it. Each card has a synced Complete checkbox beside its left-aligned timestamp. Trash remains in the upper right.

All existing sequences appear on the board, including those previously marked Later or Archive.
