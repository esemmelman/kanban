create extension if not exists pgcrypto;
create table if not exists public.kanban_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 500),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.kanban_notes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.kanban_items(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(item_id, position)
);
create index if not exists kanban_notes_item_id_idx on public.kanban_notes(item_id);
alter table public.kanban_items enable row level security;
alter table public.kanban_notes enable row level security;
grant select, insert, update, delete on public.kanban_items to anon, authenticated;
grant select, insert, update, delete on public.kanban_notes to anon, authenticated;
create policy "Public board items are readable" on public.kanban_items for select to anon, authenticated using (true);
create policy "Public board items are addable" on public.kanban_items for insert to anon, authenticated with check (true);
create policy "Public board items are editable" on public.kanban_items for update to anon, authenticated using (true) with check (true);
create policy "Public board items are removable" on public.kanban_items for delete to anon, authenticated using (true);
create policy "Public board notes are readable" on public.kanban_notes for select to anon, authenticated using (true);
create policy "Public board notes are addable" on public.kanban_notes for insert to anon, authenticated with check (true);
create policy "Public board notes are editable" on public.kanban_notes for update to anon, authenticated using (true) with check (true);
create policy "Public board notes are removable" on public.kanban_notes for delete to anon, authenticated using (true);
alter publication supabase_realtime add table public.kanban_items, public.kanban_notes;
