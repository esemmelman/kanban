alter table public.kanban_items add column if not exists archived boolean not null default false;
