-- Saves do Perdido no Supabase (rode no SQL Editor do projeto).
-- Cada usuário tem até 3 espaços (slot 1..3). O jogo grava o JSON inteiro do save em "data".
create table if not exists public.saves (
  user_id    uuid not null references auth.users(id) on delete cascade,
  slot       smallint not null check (slot between 1 and 3),
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

alter table public.saves enable row level security;

-- cada um só lê, cria, altera e apaga os PRÓPRIOS saves
create policy "saves: ler os meus"    on public.saves for select using (auth.uid() = user_id);
create policy "saves: criar os meus"  on public.saves for insert with check (auth.uid() = user_id);
create policy "saves: alterar os meus" on public.saves for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saves: apagar os meus" on public.saves for delete using (auth.uid() = user_id);

-- limite de tamanho (o save típico tem poucos KB; 512 KB protege contra abuso)
alter table public.saves add constraint saves_tamanho check (pg_column_size(data) < 524288);
