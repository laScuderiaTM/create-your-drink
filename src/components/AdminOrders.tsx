"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatLei, type Order } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  new: "Nouă",
  preparing: "În preparare",
  ready: "Gata",
  in_pos: "În POS",
  cancelled: "Anulată",
};

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function AdminOrders() {
  const [day, setDay] = useState(todayISO());
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const from = new Date(`${day}T00:00:00`);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    supabase()
      .from("orders")
      .select("*")
      .gte("created_at", from.toISOString())
      .lt("created_at", to.toISOString())
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data ?? []) as Order[]));
  }, [day]);

  const valid = orders.filter((o) => o.status !== "cancelled");
  const total = valid.reduce((s, o) => s + Number(o.total), 0);

  const counts = new Map<string, number>();
  for (const o of valid) for (const it of o.items) counts.set(it.name_ro, (counts.get(it.name_ro) ?? 0) + it.qty);
  const popular = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        <Stat label="Comenzi" value={String(valid.length)} />
        <Stat label="Total" value={formatLei(total)} />
        <Stat label="Medie / comandă" value={valid.length ? formatLei(total / valid.length) : "–"} />
      </div>

      {popular.length > 0 && (
        <div className="rounded-2xl bg-surface p-4">
          <h3 className="mb-2 text-sm uppercase tracking-wider text-muted">Cele mai alese ingrediente</h3>
          <div className="flex flex-wrap gap-2">
            {popular.map(([name, n]) => (
              <span key={name} className="rounded-full bg-surface-2 px-3 py-1 text-sm">
                {name} <span className="text-muted">×{n}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="p-3 font-normal">Ora</th>
              <th className="p-3 font-normal">Cod</th>
              <th className="p-3 font-normal">Client / masă</th>
              <th className="p-3 font-normal">Băutură</th>
              <th className="p-3 font-normal">Status</th>
              <th className="p-3 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id} className={o.status === "cancelled" ? "opacity-50" : ""}>
                <td className="p-3">{new Date(o.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}</td>
                <td className="p-3 font-semibold text-accent">{o.code}</td>
                <td className="p-3">
                  {o.customer_name} {o.table_no && <span className="text-muted">· {o.table_no}</span>}
                </td>
                <td className="p-3">
                  {o.category_name}
                  <span className="block text-xs text-muted">{o.items.map((i) => (i.qty > 1 ? `${i.qty}× ${i.name_ro}` : i.name_ro)).join(", ")}</span>
                </td>
                <td className="p-3">{STATUS_LABEL[o.status]}</td>
                <td className="p-3 text-right">{formatLei(o.total)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted">
                  Nicio comandă în ziua aleasă.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-4 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
