"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LangSwitch } from "@/components/LangSwitch";
import { Logo } from "@/components/Logo";
import { pick, useLang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { formatLei, type Category, type Option, type Step } from "@/lib/types";

type Phase = { kind: "category" } | { kind: "step"; index: number } | { kind: "review" } | { kind: "done"; code: string; total: number };

const KIOSK_IDLE_MS = 90_000;
const KIOSK_DONE_MS = 20_000;

export function Wizard({ table: tableFromUrl, kiosk }: { table: string; kiosk: boolean }) {
  const { t, lang } = useLang();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [loadError, setLoadError] = useState(false);

  const [category, setCategory] = useState<Category | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "category" });
  const [qty, setQty] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [table, setTable] = useState(tableFromUrl);
  const [adult, setAdult] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;
    fetchMenu().then((menu) => {
      if (!active) return;
      if (!menu) return setLoadError(true);
      setCategories(menu.categories);
      setSteps(menu.steps);
      setOptions(menu.options);
    });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reset = useCallback(() => {
    setCategory(null);
    setPhase({ kind: "category" });
    setQty({});
    setName("");
    setTable(tableFromUrl);
    setAdult(false);
    setSendError("");
    load();
  }, [load, tableFromUrl]);

  // Kiosk: revine la început după inactivitate / după trimitere.
  useEffect(() => {
    if (!kiosk) return;
    const ms = phase.kind === "done" ? KIOSK_DONE_MS : KIOSK_IDLE_MS;
    if (phase.kind === "category" && !category) return;
    let timer = setTimeout(reset, ms);
    const bump = () => {
      clearTimeout(timer);
      timer = setTimeout(reset, ms);
    };
    window.addEventListener("pointerdown", bump);
    window.addEventListener("keydown", bump);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
    };
  }, [kiosk, phase, category, reset]);

  const catSteps = useMemo(
    () => (category ? steps.filter((s) => s.category_id === category.id) : []),
    [category, steps],
  );
  const optionsOf = useCallback((stepId: string) => options.filter((o) => o.step_id === stepId), [options]);
  const stepTotal = useCallback(
    (stepId: string) => optionsOf(stepId).reduce((sum, o) => sum + (qty[o.id] ?? 0), 0),
    [optionsOf, qty],
  );

  const total = useMemo(() => {
    if (!category) return 0;
    return options.reduce((sum, o) => sum + (qty[o.id] ?? 0) * Number(o.price), Number(category.base_price));
  }, [category, options, qty]);

  const hasAlcohol = catSteps.some((s) => s.is_alcohol && stepTotal(s.id) > 0);

  function chooseCategory(c: Category) {
    setCategory(c);
    setQty({});
    const hasSteps = steps.some((s) => s.category_id === c.id);
    setPhase(hasSteps ? { kind: "step", index: 0 } : { kind: "review" });
  }

  function change(step: Step, opt: Option, delta: number) {
    setQty((prev) => {
      const next = { ...prev };
      const current = next[opt.id] ?? 0;
      const used = optionsOf(step.id).reduce((sum, o) => sum + (next[o.id] ?? 0), 0);
      // Pas cu o singură alegere: selecția înlocuiește alegerea anterioară.
      if (delta > 0 && step.max_select === 1 && opt.max_qty === 1) {
        for (const o of optionsOf(step.id)) delete next[o.id];
        if (current === 0) next[opt.id] = 1;
        return next;
      }
      const target = current + delta;
      if (target < 0 || target > opt.max_qty) return prev;
      if (delta > 0 && used >= step.max_select) return prev;
      if (target === 0) delete next[opt.id];
      else next[opt.id] = target;
      return next;
    });
  }

  function goBack() {
    if (phase.kind === "step") {
      if (phase.index === 0) {
        setCategory(null);
        setPhase({ kind: "category" });
      } else setPhase({ kind: "step", index: phase.index - 1 });
    } else if (phase.kind === "review") {
      if (catSteps.length) setPhase({ kind: "step", index: catSteps.length - 1 });
      else {
        setCategory(null);
        setPhase({ kind: "category" });
      }
    }
  }

  function goNext() {
    if (phase.kind !== "step") return;
    if (phase.index < catSteps.length - 1) setPhase({ kind: "step", index: phase.index + 1 });
    else setPhase({ kind: "review" });
  }

  async function send() {
    if (!category) return;
    setSending(true);
    setSendError("");
    const items = Object.entries(qty).map(([option_id, q]) => ({ option_id, qty: q }));
    const { data, error } = await supabase().rpc("create_order", {
      p_category_id: category.id,
      p_items: items,
      p_table: table,
      p_name: name,
      p_lang: lang,
    });
    setSending(false);
    if (error || !data?.[0]) {
      setSendError(error?.message ?? t.error);
      load();
      return;
    }
    setPhase({ kind: "done", code: data[0].order_code, total: Number(data[0].order_total) });
  }

  const header = (
    <header className="flex items-center justify-between">
      <Link href="/" aria-label="La Scuderia">
        <Logo size="sm" />
      </Link>
      <LangSwitch />
    </header>
  );

  if (loadError) {
    return (
      <Shell>
        {header}
        <p className="mt-10 text-center text-danger">{t.error}</p>
      </Shell>
    );
  }

  if (!categories) {
    return (
      <Shell>
        {header}
        <p className="mt-10 text-center text-muted">{t.loading}</p>
      </Shell>
    );
  }

  // ───────── Confirmare ─────────
  if (phase.kind === "done") {
    return (
      <Shell>
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg">{t.thanks}</p>
          <p className="text-sm uppercase tracking-widest text-muted">{t.yourCode}</p>
          <p className="font-display text-7xl italic text-accent">{phase.code}</p>
          <p className="text-2xl font-semibold">{formatLei(phase.total)}</p>
          <p className="mt-2 rounded-2xl border border-accent bg-accent/10 px-5 py-4 text-lg font-semibold">{t.payNow}</p>
          <p className="text-sm text-muted">{t.payNote}</p>
          <div className="mt-6 flex w-full flex-col gap-3">
            <button onClick={reset} className="rounded-2xl bg-accent py-4 font-semibold text-accent-ink">
              {t.newDrink}
            </button>
            {!kiosk && (
              <Link href="/" className="rounded-2xl border border-line py-4 font-semibold">
                {t.home}
              </Link>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  // ───────── Alegere categorie ─────────
  if (phase.kind === "category" || !category) {
    return (
      <Shell>
        {header}
        <h2 className="mt-8 font-display text-3xl">{t.chooseType}</h2>
        {categories.length === 0 && <p className="mt-6 text-muted">{t.noCategories}</p>}
        <div className="mt-6 flex flex-col gap-3">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => chooseCategory(c)}
              className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5 text-left transition active:scale-[0.98] hover:border-accent"
            >
              <div>
                <p className="text-lg font-semibold">{pick(c, "name", lang)}</p>
                {pick(c, "description", lang) && <p className="mt-1 text-sm text-muted">{pick(c, "description", lang)}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted">{t.from}</p>
                <p className="font-semibold text-accent">{formatLei(c.base_price)}</p>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted">{t.baseIncluded}</p>
      </Shell>
    );
  }

  const progress = (
    <div className="mt-6 flex gap-1.5">
      {catSteps.map((s, i) => (
        <div
          key={s.id}
          className={`h-1 flex-1 rounded-full ${
            phase.kind === "review" || (phase.kind === "step" && i <= phase.index) ? "bg-accent" : "bg-line"
          }`}
        />
      ))}
      <div className={`h-1 flex-1 rounded-full ${phase.kind === "review" ? "bg-accent" : "bg-line"}`} />
    </div>
  );

  // ───────── Pas ─────────
  if (phase.kind === "step") {
    const step = catSteps[phase.index];
    const used = stepTotal(step.id);
    const canNext = used >= step.min_select && used <= step.max_select;
    return (
      <Shell>
        {header}
        {progress}
        <p className="mt-6 text-sm text-muted">{pick(category, "name", lang)}</p>
        <h2 className="font-display text-3xl">{pick(step, "name", lang)}</h2>
        <p className="mt-1 text-sm text-muted">
          {step.min_select === 0 && `${t.optional} · `}
          {t.chooseBetween(step.min_select, step.max_select)}
          {pick(step, "hint", lang) && ` · ${pick(step, "hint", lang)}`}
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 pb-32 sm:grid-cols-2">
          {optionsOf(step.id).map((o) => {
            const q = qty[o.id] ?? 0;
            const full = used >= step.max_select && !(step.max_select === 1 && o.max_qty === 1);
            const disabled = !o.in_stock;
            if (o.max_qty > 1) {
              return (
                <div
                  key={o.id}
                  className={`flex items-center justify-between rounded-2xl border p-4 ${
                    q > 0 ? "border-accent bg-accent/10" : "border-line bg-surface"
                  } ${disabled ? "opacity-40" : ""}`}
                >
                  <OptionLabel o={o} lang={lang} soldOut={disabled ? t.outOfStock : ""} />
                  <div className="flex items-center gap-3">
                    <StepperButton onClick={() => change(step, o, -1)} disabled={q === 0}>
                      −
                    </StepperButton>
                    <span className="w-4 text-center font-semibold">{q}</span>
                    <StepperButton onClick={() => change(step, o, 1)} disabled={disabled || full || q >= o.max_qty}>
                      +
                    </StepperButton>
                  </div>
                </div>
              );
            }
            return (
              <button
                key={o.id}
                disabled={disabled || (q === 0 && full)}
                onClick={() => change(step, o, q > 0 ? -1 : 1)}
                className={`flex items-center justify-between rounded-2xl border p-4 text-left transition active:scale-[0.98] disabled:opacity-40 ${
                  q > 0 ? "border-accent bg-accent/10" : "border-line bg-surface"
                }`}
              >
                <OptionLabel o={o} lang={lang} soldOut={disabled ? t.outOfStock : ""} />
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-sm ${
                    q > 0 ? "border-accent bg-accent text-accent-ink" : "border-line"
                  }`}
                >
                  {q > 0 ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
        <BottomBar total={total} label={t.total}>
          <button onClick={goBack} className="rounded-xl border border-line px-5 py-3 font-semibold">
            {t.back}
          </button>
          <button
            onClick={goNext}
            disabled={!canNext}
            className="flex-1 rounded-xl bg-accent px-5 py-3 font-semibold text-accent-ink disabled:opacity-40"
          >
            {t.next}
          </button>
        </BottomBar>
      </Shell>
    );
  }

  // ───────── Rezumat ─────────
  const chosen = catSteps.flatMap((s) =>
    optionsOf(s.id)
      .filter((o) => (qty[o.id] ?? 0) > 0)
      .map((o) => ({ step: s, o, q: qty[o.id] })),
  );
  const canSend = name.trim().length > 0 && (!hasAlcohol || adult) && !sending;

  return (
    <Shell>
      {header}
      {progress}
      <h2 className="mt-6 font-display text-3xl">{t.summary}</h2>
      <p className="text-sm text-muted">{pick(category, "name", lang)}</p>
      <ul className="mt-5 divide-y divide-line rounded-2xl border border-line bg-surface">
        <li className="flex justify-between p-4">
          <span>{t.base}</span>
          <span>{formatLei(category.base_price)}</span>
        </li>
        {chosen.map(({ step, o, q }) => (
          <li key={o.id} className="flex justify-between gap-3 p-4">
            <span>
              <span className="text-xs text-muted">{pick(step, "name", lang)} · </span>
              {pick(o, "name", lang)}
              {q > 1 && ` ×${q}`}
            </span>
            <span className="shrink-0">{formatLei(Number(o.price) * q)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-3 pb-32">
        <label className="flex flex-col gap-1 text-sm">
          {t.yourName}
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t.table}
          <input value={table} onChange={(e) => setTable(e.target.value)} maxLength={20} inputMode="numeric" />
        </label>
        {hasAlcohol && (
          <label className="mt-2 flex items-start gap-3 text-sm">
            <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[var(--accent)]" />
            <span>
              {t.adult}
              <span className="block text-xs text-muted">{t.adultNote}</span>
            </span>
          </label>
        )}
        <p className="text-xs text-muted">{t.priceNote}</p>
        {sendError && <p className="text-sm text-danger">{sendError}</p>}
      </div>

      <BottomBar total={total} label={t.total}>
        <button onClick={goBack} className="rounded-xl border border-line px-5 py-3 font-semibold">
          {t.back}
        </button>
        <button
          onClick={send}
          disabled={!canSend}
          className="flex-1 rounded-xl bg-accent px-5 py-3 font-semibold text-accent-ink disabled:opacity-40"
        >
          {sending ? t.sending : t.send}
        </button>
      </BottomBar>
    </Shell>
  );
}

async function fetchMenu() {
  const db = supabase();
  const [c, s, o] = await Promise.all([
    db.from("categories").select("*").eq("active", true).order("sort_order"),
    db.from("steps").select("*").order("sort_order"),
    db.from("options").select("*").order("sort_order"),
  ]);
  if (c.error || s.error || o.error) return null;
  return { categories: c.data as Category[], steps: s.data as Step[], options: o.data as Option[] };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="checkered h-3 w-full" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-5">{children}</main>
    </>
  );
}

function OptionLabel({ o, lang, soldOut }: { o: Option; lang: "ro" | "en"; soldOut: string }) {
  return (
    <div>
      <p className="font-medium">{pick(o, "name", lang)}</p>
      <p className="text-sm text-muted">{soldOut || `+${formatLei(o.price)}`}</p>
    </div>
  );
}

function StepperButton(props: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-lg disabled:opacity-30"
    >
      {props.children}
    </button>
  );
}

function BottomBar({ total, label, children }: { total: number; label: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted">{label}</span>
          <span className="text-2xl font-semibold text-accent">{formatLei(total)}</span>
        </div>
        <div className="flex gap-3">{children}</div>
      </div>
    </div>
  );
}
