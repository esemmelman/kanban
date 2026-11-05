alter table public.kanban_items add column category text not null default '' check (char_length(category) <= 80);
