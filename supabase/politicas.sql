-- =========================================================
--  Mis Metas: usuarios y seguridad
--  Pegar en Supabase → SQL Editor → Run (se puede ejecutar varias veces)
--  Tablas: public.metas y public.registrosmetas
-- =========================================================

-- 1) Cada fila pertenece a un usuario. Al insertar desde la app se llena solo.
alter table public.metas
  add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete cascade;
alter table public.registrosmetas
  add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete cascade;

create index if not exists metas_user_id_idx on public.metas (user_id);
create index if not exists registrosmetas_user_id_idx on public.registrosmetas (user_id);
create index if not exists registrosmetas_meta_fecha_idx on public.registrosmetas (meta_id, fecha);

-- 2) Un solo registro por meta y día (la app lo necesita para marcar/desmarcar)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.registrosmetas'::regclass and contype = 'u'
      and conkey = array[
        (select attnum from pg_attribute where attrelid = 'public.registrosmetas'::regclass and attname = 'meta_id'),
        (select attnum from pg_attribute where attrelid = 'public.registrosmetas'::regclass and attname = 'fecha')
      ]::smallint[]
  ) then
    alter table public.registrosmetas add constraint registrosmetas_meta_fecha_key unique (meta_id, fecha);
  end if;
end $$;

-- 3) Seguridad: RLS + políticas (cada usuario solo ve y edita lo suyo)
alter table public.metas enable row level security;
alter table public.registrosmetas enable row level security;

drop policy if exists "metas: solo el dueño" on public.metas;
create policy "metas: solo el dueño" on public.metas
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "registrosmetas: solo el dueño" on public.registrosmetas;
create policy "registrosmetas: solo el dueño" on public.registrosmetas
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.metas m where m.id = meta_id and m.user_id = (select auth.uid()))
  );

-- 4) Permisos para la API (los usuarios con sesión iniciada)
grant select, insert, update, delete on public.metas to authenticated;
grant select, insert, update, delete on public.registrosmetas to authenticated;

-- ---------------------------------------------------------
-- OPCIONAL: si ya subiste filas desde el Excel, quedaron sin dueño (user_id vacío)
-- y no se verán en la app. Después de crear tu cuenta, busca tu id en
-- Authentication → Users y ejecuta (cambiando el uuid):
--
-- update public.metas         set user_id = 'TU-USER-ID' where user_id is null;
-- update public.registrosmetas set user_id = 'TU-USER-ID' where user_id is null;
-- ---------------------------------------------------------
