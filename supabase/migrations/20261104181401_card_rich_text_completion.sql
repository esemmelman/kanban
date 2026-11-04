alter table public.kanban_items add column if not exists rich_text text, add column if not exists completed boolean not null default false;
alter table public.kanban_notes add column if not exists rich_text text, add column if not exists completed boolean not null default false;
