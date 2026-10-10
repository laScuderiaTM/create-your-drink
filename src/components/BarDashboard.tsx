"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SignOut } from "@/components/StaffGate";
import { supabase } from "@/lib/supabase";
import { formatLei, type Order, type OrderStatus } from "@/lib/types";

const COLUMNS: { status: OrderStatus; title: string }[] = [
  { status: "new", title: "Noi" },
  { status: "preparing", title: "În preparare" },
  { status: "ready", title: "Gata" },
];

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  new: { to: "preparing", label: "Încep" },
  preparing: { to: "ready", label: "E gata" },
  ready: { to: "in_pos", label: "Trecut în POS" },
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function BarDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [live, setLive] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const known = useRef<Set<string>>(new Set());

  const beep = useCallback(() => {
    const ctx = audio.current;
    if (!ctx) return;
    [0, 0.18].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.15);
    });
  }, []);

  const load = useCallback(async () => {
    const list = await fetchToday();
    if (!list) return;
    const isFirstLoad = known.current.size === 0;
    const fresh = list.some((o) => !known.current.has(o.id));
    list.forEach((o) => known.current.add(o.id));
    if (fresh && !isFirstLoad) beep();
    setOrders(list);
  }, [beep]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const channel = supabase()
      .channel("orders-bar")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    const poll = setInterval(load, 30_000); // plasă de siguranță dacă realtime pică
    return () => {
      clearTimeout(first);
      clearInterval(poll);
      supabase().removeChannel(channel);
    };
  }, [load]);

  async function setStatus(o: Order, status: OrderStatus) {
    setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, status } : x)));
    const { error } = await supabase().from("orders").update({ status }).eq("id", o.id);
    if (error) load();
  }

  function enableSound() {
    audio.current = new AudioContext();
    setSoundOn(true);
    beep();
  }

  const done = orders.filter((o) => o.status === "in_pos" || o.status === "cancelled").reverse();
  const todayTotal = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl text-accent">Comenzi bar</h1>
          <span className={`h-2.5 w-2.5 rounded-full ${live ? "bg-ok" : "bg-danger"}`} title={live ? "Live" : "Offline"} />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted">
            Azi: {orders.length} comenzi · {formatLei(todayTotal)}
          </span>
          {!soundOn && (
            <button onClick={enableSound} className="rounded-lg bg-accent px-3 py-2 font-semibold text-accent-ink">
              🔔 Activează sunetul
            </button>
          )}
          <button onClick={() => setShowDone((v) => !v)} className="rounded-lg border border-line px-3 py-2">
            {showDone ? "Ascunde finalizate" : `Finalizate (${done.length})`}
          </button>
          <SignOut />
        </div>
      </header>

      <div className="grid flex-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="flex flex-col gap-3 rounded-2xl bg-surface p-3">
              <h2 className="px-1 font-semibold">
                {col.title} <span className="text-muted">({list.length})</span>
              </h2>
              {list.map((o) => (
                <OrderCard key={o.id} o={o} onStatus={setStatus} />
              ))}
            </section>
          );
        })}
      </div>

      {showDone && (
        <section className="rounded-2xl bg-surface p-3">
          <h2 className="mb-3 px-1 font-semibold">Finalizate azi</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {done.map((o) => (
              <OrderCard key={o.id} o={o} onStatus={setStatus} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

async function fetchToday() {
  const { data } = await supabase()
    .from("orders")
    .select("*")
    .gte("created_at", startOfToday())
    .order("created_at", { ascending: true });
  return data as Order[] | null;
}

function OrderCard({ o, onStatus }: { o: Order; onStatus: (o: Order, s: OrderStatus) => void }) {
  const next = NEXT[o.status];
  const time = new Date(o.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  return (
    <article
      className={`rounded-xl border p-3 ${
        o.status === "new" ? "border-accent bg-accent/10" : "border-line bg-surface-2"
      } ${o.status === "cancelled" ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-3xl text-accent">{o.code}</p>
          <p className="text-sm">
            {o.customer_name || "—"}
            {o.table_no && <span className="text-muted"> · Masa {o.table_no}</span>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">{formatLei(o.total)}</p>
          <p className="text-xs text-muted">{time}</p>
        </div>
      </div>
      <p className="mt-2 text-sm font-semibold">
        {o.category_name}
        {o.has_alcohol && <span className="ml-2 rounded bg-danger/20 px-1.5 py-0.5 text-xs text-danger">18+</span>}
        {o.lang === "en" && <span className="ml-2 rounded bg-line px-1.5 py-0.5 text-xs">EN</span>}
      </p>
      <ul className="mt-1 text-sm text-muted">
        {o.items.map((it, i) => (
          <li key={i}>
            {it.qty > 1 ? `${it.qty}× ` : ""}
            {it.name_ro} <span className="text-xs">({it.step_ro})</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        {next && (
          <button
            onClick={() => onStatus(o, next.to)}
            className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-ink"
          >
            {next.label}
          </button>
        )}
        {o.status !== "cancelled" && o.status !== "in_pos" && (
          <button
            onClick={() => confirm(`Anulezi comanda ${o.code}?`) && onStatus(o, "cancelled")}
            className="rounded-lg border border-line px-3 py-2.5 text-sm text-muted"
          >
            Anulează
          </button>
        )}
        {(o.status === "in_pos" || o.status === "cancelled") && (
          <button onClick={() => onStatus(o, "ready")} className="rounded-lg border border-line px-3 py-2.5 text-sm text-muted">
            Readu în listă
          </button>
        )}
      </div>
    </article>
  );
}
