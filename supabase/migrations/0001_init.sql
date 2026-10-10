-- La Scuderia – Create your drink
-- Rulează o singură dată în Supabase → SQL Editor (sau cu `supabase db push`).

-- ───────────────────────── Staff (admin / bar) ─────────────────────────
create table public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'bar')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where user_id = auth.uid());
$$;

-- ───────────────────────── Meniu configurabil ─────────────────────────
-- Categorie = tip de băutură (ex: „Fără alcool”, „Cu alcool”, „Premium”).
-- base_price = paharul + gheața.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name_ro text not null,
  name_en text not null default '',
  description_ro text not null default '',
  description_en text not null default '',
  base_price numeric(10,2) not null default 0 check (base_price >= 0),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Pas din wizard (ex: „Sucuri”, „Alcool”). min/max_select se aplică pe
-- numărul total de bucăți alese în pas (ex: Alcool max 2 = max 2 shot-uri).
create table public.steps (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name_ro text not null,
  name_en text not null default '',
  hint_ro text not null default '',
  hint_en text not null default '',
  min_select int not null default 0 check (min_select >= 0),
  max_select int not null default 1 check (max_select >= 1),
  is_alcohol boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check (min_select <= max_select)
);

-- Ingredient / opțiune dintr-un pas.
create table public.options (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.steps(id) on delete cascade,
  name_ro text not null,
  name_en text not null default '',
  price numeric(10,2) not null default 0 check (price >= 0),
  max_qty int not null default 1 check (max_qty >= 1),
  in_stock boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index on public.steps (category_id, sort_order);
create index on public.options (step_id, sort_order);

-- ───────────────────────── Comenzi ─────────────────────────
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  table_no text not null default '',
  customer_name text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  category_name text not null,
  items jsonb not null,           -- copie a alegerilor, cu prețurile de atunci
  total numeric(10,2) not null,
  has_alcohol boolean not null default false,
  status text not null default 'new'
    check (status in ('new', 'preparing', 'ready', 'in_pos', 'cancelled')),
  lang text not null default 'ro',
  created_at timestamptz not null default now()
);

create index on public.orders (created_at desc);

-- ───────────────────────── RLS ─────────────────────────
alter table public.staff enable row level security;
alter table public.categories enable row level security;
alter table public.steps enable row level security;
alter table public.options enable row level security;
alter table public.orders enable row level security;

create policy "staff: self read" on public.staff
  for select using (user_id = auth.uid() or public.is_admin());

create policy "categories: public read" on public.categories for select using (true);
create policy "categories: admin write" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

create policy "steps: public read" on public.steps for select using (true);
create policy "steps: admin write" on public.steps for all
  using (public.is_admin()) with check (public.is_admin());

create policy "options: public read" on public.options for select using (true);
create policy "options: admin write" on public.options for all
  using (public.is_admin()) with check (public.is_admin());

-- Clienții NU pot scrie direct în orders; doar prin create_order().
create policy "orders: staff read" on public.orders for select using (public.is_staff());
create policy "orders: staff update" on public.orders for update
  using (public.is_staff()) with check (public.is_staff());
create policy "orders: admin delete" on public.orders for delete using (public.is_admin());

-- ───────────────────────── create_order (prețul se calculează aici) ─────────────────────────
-- p_items: [{"option_id": "<uuid>", "qty": 1}, ...]
create or replace function public.create_order(
  p_category_id uuid,
  p_items jsonb,
  p_table text default '',
  p_name text default '',
  p_lang text default 'ro'
) returns table (order_id uuid, order_code text, order_total numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_cat categories%rowtype;
  v_step record;
  v_line record;
  v_step_qty int;
  v_total numeric(10,2);
  v_items jsonb := '[]'::jsonb;
  v_has_alcohol boolean := false;
  v_seq int;
  v_code text;
  v_id uuid;
begin
  select * into v_cat from categories where id = p_category_id and active;
  if not found then
    raise exception 'Categoria nu există sau nu e activă';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 50 then
    raise exception 'Listă de ingrediente invalidă';
  end if;

  -- Liniile cerute, agregate pe opțiune, unite cu datele reale din DB.
  drop table if exists _lines;
  create temp table _lines on commit drop as
  select o.id as option_id, o.step_id, o.name_ro, o.name_en, o.price, o.max_qty, o.in_stock,
         s.category_id, sum(greatest((x->>'qty')::int, 0))::int as qty
  from jsonb_array_elements(p_items) x
  left join options o on o.id = (x->>'option_id')::uuid
  left join steps s on s.id = o.step_id
  group by o.id, o.step_id, o.name_ro, o.name_en, o.price, o.max_qty, o.in_stock, s.category_id;

  for v_line in select * from _lines loop
    if v_line.option_id is null or v_line.category_id <> p_category_id then
      raise exception 'Ingredient invalid';
    end if;
    if not v_line.in_stock then
      raise exception 'Ingredientul „%” nu mai este disponibil', v_line.name_ro;
    end if;
    if v_line.qty < 1 or v_line.qty > v_line.max_qty then
      raise exception 'Cantitate invalidă pentru „%”', v_line.name_ro;
    end if;
  end loop;

  v_total := v_cat.base_price;

  for v_step in select * from steps where category_id = p_category_id order by sort_order loop
    select coalesce(sum(qty), 0) into v_step_qty from _lines where step_id = v_step.id;
    if v_step_qty < v_step.min_select or v_step_qty > v_step.max_select then
      raise exception 'Pasul „%” cere între % și % alegeri', v_step.name_ro, v_step.min_select, v_step.max_select;
    end if;
    if v_step_qty > 0 and v_step.is_alcohol then
      v_has_alcohol := true;
    end if;
    select v_items || coalesce(jsonb_agg(jsonb_build_object(
             'step_ro', v_step.name_ro, 'step_en', v_step.name_en,
             'name_ro', l.name_ro, 'name_en', l.name_en,
             'qty', l.qty, 'unit_price', l.price, 'line_total', l.price * l.qty)), '[]'::jsonb),
           v_total + coalesce(sum(l.price * l.qty), 0)
      into v_items, v_total
      from _lines l where l.step_id = v_step.id;
  end loop;

  -- Cod scurt pe zi: A01..A99, B01.. (ora României)
  perform pg_advisory_xact_lock(hashtext('orders_code'));
  select count(*) + 1 into v_seq from orders
   where created_at >= date_trunc('day', now() at time zone 'Europe/Bucharest') at time zone 'Europe/Bucharest';
  v_code := chr(65 + ((v_seq - 1) / 99) % 26) || lpad((((v_seq - 1) % 99) + 1)::text, 2, '0');

  insert into orders (code, table_no, customer_name, category_id, category_name, items, total, has_alcohol, lang)
  values (v_code, left(coalesce(trim(p_table), ''), 20), left(coalesce(trim(p_name), ''), 40),
          v_cat.id, v_cat.name_ro, v_items, v_total, v_has_alcohol,
          case when p_lang = 'en' then 'en' else 'ro' end)
  returning id into v_id;

  return query select v_id, v_code, v_total;
end;
$$;

revoke all on function public.create_order(uuid, jsonb, text, text, text) from public;
grant execute on function public.create_order(uuid, jsonb, text, text, text) to anon, authenticated;

-- Realtime pentru dashboard-ul de bar
alter publication supabase_realtime add table public.orders;
