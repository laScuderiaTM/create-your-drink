-- La Scuderia – plată înainte de preparare + întăriri de securitate
-- Rulează o singură dată în Supabase → SQL Editor, după 0001_init.sql.

-- ───────────────────────── Plată înainte ─────────────────────────
-- Comenzile noi intră ca „awaiting_payment”; barul le trece în preparare după încasare.
alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('awaiting_payment', 'new', 'preparing', 'ready', 'in_pos', 'cancelled'));
alter table public.orders alter column status set default 'awaiting_payment';

-- ───────────────────────── Funcții helper în afara API-ului ─────────────────────────
-- Schema „private” nu e expusă prin REST, deci is_admin()/is_staff() nu mai pot fi
-- apelate direct. Politicile le referă după OID, așa că merg în continuare.
create schema if not exists private;
grant usage on schema private to anon, authenticated;
alter function public.is_admin() set schema private;
alter function public.is_staff() set schema private;

-- Politicile de admin erau „for all”, deci se evaluau și la citirea meniului.
-- Le separăm pe scriere, ca citirea publică să nu mai treacă prin is_admin().
drop policy "categories: admin write" on public.categories;
create policy "categories: admin insert" on public.categories for insert with check (private.is_admin());
create policy "categories: admin update" on public.categories for update
  using (private.is_admin()) with check (private.is_admin());
create policy "categories: admin delete" on public.categories for delete using (private.is_admin());

drop policy "steps: admin write" on public.steps;
create policy "steps: admin insert" on public.steps for insert with check (private.is_admin());
create policy "steps: admin update" on public.steps for update
  using (private.is_admin()) with check (private.is_admin());
create policy "steps: admin delete" on public.steps for delete using (private.is_admin());

drop policy "options: admin write" on public.options;
create policy "options: admin insert" on public.options for insert with check (private.is_admin());
create policy "options: admin update" on public.options for update
  using (private.is_admin()) with check (private.is_admin());
create policy "options: admin delete" on public.options for delete using (private.is_admin());

-- ───────────────────────── Expirare comenzi neplătite ─────────────────────────
-- Rulează la fiecare comandă nouă (create_order e singura cale de inserare).
create or replace function private.orders_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Comenzile neplătite expiră după 25 de minute.
  update orders set status = 'cancelled'
   where status = 'awaiting_payment' and created_at < now() - interval '25 minutes';

  new.status := 'awaiting_payment';
  return new;
end;
$$;

revoke all on function private.orders_before_insert() from public, anon, authenticated;

create trigger orders_before_insert before insert on public.orders
  for each row execute function private.orders_before_insert();
