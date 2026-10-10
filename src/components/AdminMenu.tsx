"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatLei, type Category, type Option, type Step } from "@/lib/types";

type Table = "categories" | "steps" | "options";
type Row = { id: string; sort_order: number };

export function AdminMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");

  const apply = useCallback((menu: Awaited<ReturnType<typeof fetchAll>>) => {
    setCategories(menu.categories);
    setSteps(menu.steps);
    setOptions(menu.options);
  }, []);

  const load = useCallback(async () => apply(await fetchAll()), [apply]);

  useEffect(() => {
    let active = true;
    fetchAll().then((menu) => active && apply(menu));
    return () => {
      active = false;
    };
  }, [apply]);

  async function run(p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    setError(error ? error.message : "");
    await load();
  }

  const update = (table: Table, id: string, patch: Record<string, unknown>) =>
    run(supabase().from(table).update(patch).eq("id", id));

  const remove = (table: Table, id: string, what: string) => {
    if (confirm(`Ștergi ${what}? Nu se poate anula.`)) run(supabase().from(table).delete().eq("id", id));
  };

  async function move(table: Table, list: Row[], index: number, dir: -1 | 1) {
    const other = list[index + dir];
    if (!other) return;
    const a = list[index];
    // Renumerotează toată lista ca să nu existe sort_order egale.
    const ordered = [...list];
    ordered[index] = other;
    ordered[index + dir] = a;
    await Promise.all(ordered.map((r, i) => supabase().from(table).update({ sort_order: i + 1 }).eq("id", r.id)));
    await load();
  }

  async function addCategory() {
    const { data, error } = await supabase()
      .from("categories")
      .insert({ name_ro: "Categorie nouă", base_price: 10, active: false, sort_order: categories.length + 1 })
      .select()
      .single();
    if (error) setError(error.message);
    await load();
    if (data) setSelected(data.id);
  }

  const cat = categories.find((c) => c.id === selected) ?? null;
  const catSteps = cat ? steps.filter((s) => s.category_id === cat.id) : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="flex flex-col gap-2">
        <h2 className="px-1 text-sm uppercase tracking-wider text-muted">Tipuri de băutură</h2>
        {categories.map((c, i) => (
          <div
            key={c.id}
            className={`flex items-center gap-2 rounded-xl border p-3 ${
              selected === c.id ? "border-accent bg-accent/10" : "border-line bg-surface"
            }`}
          >
            <button onClick={() => setSelected(c.id)} className="flex-1 text-left">
              <p className="font-semibold">{c.name_ro}</p>
              <p className="text-xs text-muted">
                {formatLei(c.base_price)} · {c.active ? "activă" : "ascunsă"}
              </p>
            </button>
            <MoveButtons onUp={() => move("categories", categories, i, -1)} onDown={() => move("categories", categories, i, 1)} />
          </div>
        ))}
        <button onClick={addCategory} className="rounded-xl border border-dashed border-line p-3 text-muted hover:text-ink">
          + Tip nou de băutură
        </button>
      </aside>

      <section className="flex flex-col gap-4">
        {error && <p className="rounded-xl bg-danger/15 p-3 text-sm text-danger">{error}</p>}
        {!cat && <p className="p-6 text-muted">Alege un tip de băutură din stânga ca să-l editezi.</p>}
        {cat && (
          <>
            <div className="rounded-2xl bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl">{cat.name_ro}</h2>
                <div className="flex items-center gap-3">
                  <Toggle
                    checked={cat.active}
                    onChange={(v) => update("categories", cat.id, { active: v })}
                    label={cat.active ? "Vizibilă pentru clienți" : "Ascunsă"}
                  />
                  <button onClick={() => remove("categories", cat.id, `„${cat.name_ro}” cu toți pașii ei`)} className="text-sm text-danger">
                    Șterge
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Nume (RO)" value={cat.name_ro} onSave={(v) => update("categories", cat.id, { name_ro: v })} />
                <Field label="Nume (EN)" value={cat.name_en} onSave={(v) => update("categories", cat.id, { name_en: v })} />
                <Field label="Descriere (RO)" value={cat.description_ro} onSave={(v) => update("categories", cat.id, { description_ro: v })} />
                <Field label="Descriere (EN)" value={cat.description_en} onSave={(v) => update("categories", cat.id, { description_en: v })} />
                <NumberField
                  label="Preț bază – pahar + gheață (lei)"
                  value={cat.base_price}
                  onSave={(v) => update("categories", cat.id, { base_price: v })}
                />
              </div>
            </div>

            {catSteps.map((s, i) => (
              <StepEditor
                key={s.id}
                step={s}
                index={i}
                options={options.filter((o) => o.step_id === s.id)}
                onUpdate={update}
                onRemove={remove}
                onMove={(dir) => move("steps", catSteps, i, dir)}
                onMoveOption={(list, idx, dir) => move("options", list, idx, dir)}
                onAddOption={() =>
                  run(
                    supabase()
                      .from("options")
                      .insert({ step_id: s.id, name_ro: "Ingredient nou", price: 0, sort_order: options.filter((o) => o.step_id === s.id).length + 1 }),
                  )
                }
              />
            ))}

            <button
              onClick={() =>
                run(supabase().from("steps").insert({ category_id: cat.id, name_ro: "Pas nou", min_select: 0, max_select: 1, sort_order: catSteps.length + 1 }))
              }
              className="rounded-2xl border border-dashed border-line p-4 text-muted hover:text-ink"
            >
              + Adaugă pas
            </button>
          </>
        )}
      </section>
    </div>
  );
}

async function fetchAll() {
  const db = supabase();
  const [c, s, o] = await Promise.all([
    db.from("categories").select("*").order("sort_order"),
    db.from("steps").select("*").order("sort_order"),
    db.from("options").select("*").order("sort_order"),
  ]);
  return {
    categories: (c.data ?? []) as Category[],
    steps: (s.data ?? []) as Step[],
    options: (o.data ?? []) as Option[],
  };
}

function StepEditor(props: {
  step: Step;
  index: number;
  options: Option[];
  onUpdate: (t: Table, id: string, patch: Record<string, unknown>) => void;
  onRemove: (t: Table, id: string, what: string) => void;
  onMove: (dir: -1 | 1) => void;
  onMoveOption: (list: Row[], idx: number, dir: -1 | 1) => void;
  onAddOption: () => void;
}) {
  const { step: s, options, onUpdate, onRemove } = props;
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">
          <span className="text-muted">Pasul {props.index + 1}:</span> {s.name_ro}
        </h3>
        <div className="flex items-center gap-3">
          <MoveButtons onUp={() => props.onMove(-1)} onDown={() => props.onMove(1)} />
          <button onClick={() => onRemove("steps", s.id, `pasul „${s.name_ro}”`)} className="text-sm text-danger">
            Șterge pasul
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Nume (RO)" value={s.name_ro} onSave={(v) => onUpdate("steps", s.id, { name_ro: v })} />
        <Field label="Nume (EN)" value={s.name_en} onSave={(v) => onUpdate("steps", s.id, { name_en: v })} />
        <Field label="Indiciu (RO)" value={s.hint_ro} onSave={(v) => onUpdate("steps", s.id, { hint_ro: v })} />
        <Field label="Indiciu (EN)" value={s.hint_en} onSave={(v) => onUpdate("steps", s.id, { hint_en: v })} />
        <NumberField label="Minim alegeri (0 = opțional)" value={s.min_select} integer onSave={(v) => onUpdate("steps", s.id, { min_select: v })} />
        <NumberField label="Maxim alegeri" value={s.max_select} integer onSave={(v) => onUpdate("steps", s.id, { max_select: v })} />
        <div className="flex items-end pb-2">
          <Toggle checked={s.is_alcohol} onChange={(v) => onUpdate("steps", s.id, { is_alcohol: v })} label="Conține alcool (18+)" />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="p-1 font-normal">Ingredient (RO)</th>
              <th className="p-1 font-normal">Ingredient (EN)</th>
              <th className="w-24 p-1 font-normal">Preț (lei)</th>
              <th className="w-20 p-1 font-normal">Max buc.</th>
              <th className="p-1 font-normal">Stoc</th>
              <th className="p-1" />
            </tr>
          </thead>
          <tbody>
            {options.map((o, i) => (
              <tr key={o.id} className={o.in_stock ? "" : "opacity-50"}>
                <td className="p-1">
                  <Field value={o.name_ro} onSave={(v) => onUpdate("options", o.id, { name_ro: v })} />
                </td>
                <td className="p-1">
                  <Field value={o.name_en} onSave={(v) => onUpdate("options", o.id, { name_en: v })} />
                </td>
                <td className="p-1">
                  <NumberField value={o.price} onSave={(v) => onUpdate("options", o.id, { price: v })} />
                </td>
                <td className="p-1">
                  <NumberField value={o.max_qty} integer onSave={(v) => onUpdate("options", o.id, { max_qty: v })} />
                </td>
                <td className="p-1">
                  <button
                    onClick={() => onUpdate("options", o.id, { in_stock: !o.in_stock })}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${o.in_stock ? "bg-ok/20 text-ok" : "bg-danger/20 text-danger"}`}
                  >
                    {o.in_stock ? "În stoc" : "Epuizat"}
                  </button>
                </td>
                <td className="p-1">
                  <div className="flex items-center justify-end gap-2">
                    <MoveButtons onUp={() => props.onMoveOption(options, i, -1)} onDown={() => props.onMoveOption(options, i, 1)} />
                    <button onClick={() => onRemove("options", o.id, `„${o.name_ro}”`)} className="px-1 text-danger" title="Șterge">
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={props.onAddOption} className="mt-2 text-sm text-accent">
        + Adaugă ingredient
      </button>
    </div>
  );
}

/** Input text care salvează la blur / Enter. */
function Field({ label, value, onSave }: { label?: string; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setV(value);
  }
  const input = (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v.trim())}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="w-full"
    />
  );
  if (!label) return input;
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      {input}
    </label>
  );
}

function NumberField({ label, value, integer, onSave }: { label?: string; value: number; integer?: boolean; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value));
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setV(String(value));
  }
  const commit = () => {
    const n = integer ? parseInt(v, 10) : parseFloat(v.replace(",", "."));
    if (Number.isNaN(n) || n < 0) return setV(String(value));
    if (n !== Number(value)) onSave(n);
  };
  const input = (
    <input
      value={v}
      inputMode={integer ? "numeric" : "decimal"}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="w-full"
    />
  );
  if (!label) return input;
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      {input}
    </label>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex items-center gap-2 text-sm">
      <span className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-accent" : "bg-line"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink transition ${checked ? "left-5" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  );
}

function MoveButtons({ onUp, onDown }: { onUp: () => void; onDown: () => void }) {
  return (
    <span className="flex flex-col text-xs leading-none text-muted">
      <button onClick={onUp} className="px-1 hover:text-ink" title="Mută sus">
        ▲
      </button>
      <button onClick={onDown} className="px-1 hover:text-ink" title="Mută jos">
        ▼
      </button>
    </span>
  );
}
