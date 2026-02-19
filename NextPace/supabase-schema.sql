-- ===========================================
-- NextPace - Schema SQL para Supabase
-- Execute este SQL no SQL Editor do Dashboard
-- ===========================================

-- Extensão UUID (já habilitada no Supabase por padrão)
create extension if not exists "uuid-ossp";

-- ===========================================
-- TABELA: profiles
-- Auto-criada via trigger no signup
-- ===========================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Usuário vê próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuário atualiza próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Usuário insere próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger: criar perfil automaticamente no signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================
-- TABELA: trainings
-- ===========================================
create table public.trainings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '' not null,
  default_rest_seconds integer default 60 not null,
  rounds integer default 1 not null,
  is_favorite boolean default false not null,
  alert_sound text,
  alert_seconds_before_end integer default 5 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

create index idx_trainings_user_id on public.trainings(user_id);
create index idx_trainings_updated_at on public.trainings(updated_at);

alter table public.trainings enable row level security;

create policy "Usuário vê próprios treinos"
  on public.trainings for select
  using (auth.uid() = user_id);

create policy "Usuário cria próprios treinos"
  on public.trainings for insert
  with check (auth.uid() = user_id);

create policy "Usuário atualiza próprios treinos"
  on public.trainings for update
  using (auth.uid() = user_id);

create policy "Usuário deleta próprios treinos"
  on public.trainings for delete
  using (auth.uid() = user_id);

-- ===========================================
-- TABELA: exercises
-- ===========================================
create table public.exercises (
  id uuid primary key default uuid_generate_v4(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  name text not null,
  type text default 'exercise' not null check (type in ('exercise', 'rest')),
  sets integer,
  reps integer,
  weight numeric,
  rest_seconds integer,
  set_duration_seconds integer,
  duration_seconds integer,
  position integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

create index idx_exercises_training_id on public.exercises(training_id);
create index idx_exercises_updated_at on public.exercises(updated_at);

alter table public.exercises enable row level security;

-- Exercises herdam segurança do training pai
create policy "Usuário vê exercícios dos próprios treinos"
  on public.exercises for select
  using (
    exists (
      select 1 from public.trainings
      where trainings.id = exercises.training_id
      and trainings.user_id = auth.uid()
    )
  );

create policy "Usuário cria exercícios nos próprios treinos"
  on public.exercises for insert
  with check (
    exists (
      select 1 from public.trainings
      where trainings.id = exercises.training_id
      and trainings.user_id = auth.uid()
    )
  );

create policy "Usuário atualiza exercícios dos próprios treinos"
  on public.exercises for update
  using (
    exists (
      select 1 from public.trainings
      where trainings.id = exercises.training_id
      and trainings.user_id = auth.uid()
    )
  );

create policy "Usuário deleta exercícios dos próprios treinos"
  on public.exercises for delete
  using (
    exists (
      select 1 from public.trainings
      where trainings.id = exercises.training_id
      and trainings.user_id = auth.uid()
    )
  );

-- ===========================================
-- TABELA: workout_logs (imutável)
-- ===========================================
create table public.workout_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_id uuid references public.trainings(id) on delete set null,
  training_name text not null,
  completed_at timestamptz not null,
  duration_seconds integer default 0 not null,
  sets_completed integer default 0 not null,
  exercises_completed integer default 0 not null,
  rounds_completed integer default 0 not null,
  created_at timestamptz default now() not null
);

create index idx_workout_logs_user_id on public.workout_logs(user_id);
create index idx_workout_logs_completed_at on public.workout_logs(completed_at);

alter table public.workout_logs enable row level security;

create policy "Usuário vê próprio histórico"
  on public.workout_logs for select
  using (auth.uid() = user_id);

create policy "Usuário insere próprio histórico"
  on public.workout_logs for insert
  with check (auth.uid() = user_id);

-- Sem UPDATE nem DELETE - histórico é imutável

-- ===========================================
-- FUNÇÃO: auto-update updated_at
-- ===========================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trainings_updated_at
  before update on public.trainings
  for each row execute function public.update_updated_at();

create trigger exercises_updated_at
  before update on public.exercises
  for each row execute function public.update_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();
