-- Typy rolí a skupín
create type public.app_role as enum ('admin');
create type public.group_kind as enum ('trieda','predmet');
create type public.review_status as enum ('pending','approved','declined');

-- Roly (iba tabuľka, žiadne roly na profiloch)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;
create policy "Užívatelia čítajú vlastné roly"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, anon;

-- Učitelia
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  subject text check (char_length(subject) is null or char_length(subject) between 0 and 120),
  views integer not null default 0,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.teachers TO anon, authenticated;
GRANT ALL ON public.teachers TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
alter table public.teachers enable row level security;
create policy "Verejné čítanie učiteľov"
  on public.teachers for select to anon, authenticated using (true);
create policy "Admin spravuje učiteľov"
  on public.teachers for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Skupiny: triedy aj predmety
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  kind public.group_kind not null default 'trieda',
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.groups TO anon, authenticated;
GRANT ALL ON public.groups TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.groups TO authenticated;
alter table public.groups enable row level security;
create policy "Verejné čítanie skupín"
  on public.groups for select to anon, authenticated using (true);
create policy "Admin spravuje skupiny"
  on public.groups for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Viazba učiteľ ↔ skupina (učiteľ môže byť vo viacerých)
create table public.teacher_groups (
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  primary key (teacher_id, group_id)
);
GRANT SELECT ON public.teacher_groups TO anon, authenticated;
GRANT ALL ON public.teacher_groups TO service_role;
GRANT INSERT, DELETE ON public.teacher_groups TO authenticated;
alter table public.teacher_groups enable row level security;
create policy "Verejné čítanie viazieb"
  on public.teacher_groups for select to anon, authenticated using (true);
create policy "Admin spravuje viazby"
  on public.teacher_groups for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Recenzie
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  rating integer not null check (rating between 0 and 10),
  body text not null check (char_length(body) between 1 and 1000),
  classroom text not null check (char_length(classroom) between 1 and 40),
  public_classroom text check (public_classroom is null or char_length(public_classroom) <= 40),
  anonymous boolean not null default true,
  status public.review_status not null default 'pending',
  views integer not null default 0,
  likes integer not null default 0,
  created_at timestamptz not null default now()
);
create index reviews_teacher_status_idx on public.reviews (teacher_id, status);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT INSERT ON public.reviews TO anon;
alter table public.reviews enable row level security;
create policy "Verejné čítanie schválených recenzií"
  on public.reviews for select to anon, authenticated using (status = 'approved');
create policy "Ktokoľvek odosiela novú recenziu na schválenie"
  on public.reviews for insert to anon, authenticated
  with check (status = 'pending');
create policy "Admin spravuje recenzie"
  on public.reviews for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Normalizácia recenzií: vždy vynúti status pending pri vložení
-- a skryje triedu žiaka, ak je recenzia anonymizovaná
create or replace function public.normalize_review()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' or NEW.status = 'pending' then
    NEW.status := 'pending';
  end if;
  NEW.public_classroom := case when NEW.anonymous then null else NEW.classroom end;
  return NEW;
end $$;
create trigger reviews_normalize
  before insert or update on public.reviews
  for each row execute function public.normalize_review();

-- Lajky recenzií (jedna na zariadenie)
create table public.review_likes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  visitor_id text not null check (char_length(visitor_id) between 1 and 64),
  created_at timestamptz not null default now(),
  primary key (review_id, visitor_id)
);
GRANT SELECT, INSERT, DELETE ON public.review_likes TO anon, authenticated;
GRANT ALL ON public.review_likes TO service_role;
alter table public.review_likes enable row level security;
create policy "Lajkovanie návštevníkmi"
  on public.review_likes for insert to anon, authenticated with check (true);
create policy "Čítanie lajkov"
  on public.review_likes for select to anon, authenticated using (true);

-- Zvýšenie počtu zhliadnutí učiteľa
create or replace function public.record_teacher_view(p_teacher_id uuid)
returns void
language sql security definer set search_path = public
as $$
  update public.teachers set views = views + 1 where id = p_teacher_id;
$$;

-- Zvýšenie počtu zhliadnutí schválených recenzií učiteľa
create or replace function public.record_review_views(p_teacher_id uuid)
returns void
language sql security definer set search_path = public
as $$
  update public.reviews set views = views + 1
  where teacher_id = p_teacher_id and status = 'approved';
$$;

-- Lajk od návštevníka; vráti aktuálny počet lajkov recenzie
create or replace function public.like_review(p_review_id uuid, p_visitor_id text)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  new_likes integer;
begin
  insert into public.review_likes (review_id, visitor_id)
  values (p_review_id, p_visitor_id)
  on conflict do nothing;

  if found then
    update public.reviews set likes = likes + 1
    where id = p_review_id
    returning likes into new_likes;
  end if;

  return coalesce(new_likes, (select likes from public.reviews where id = p_review_id));
end $$;

grant execute on function public.record_teacher_view(uuid) to anon, authenticated;
grant execute on function public.record_review_views(uuid) to anon, authenticated;
grant execute on function public.like_review(uuid, text) to anon, authenticated;