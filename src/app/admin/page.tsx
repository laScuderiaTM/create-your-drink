"use client";

import { useState } from "react";
import { AdminMenu } from "@/components/AdminMenu";
import { AdminOrders } from "@/components/AdminOrders";
import { SignOut, StaffGate } from "@/components/StaffGate";

export default function AdminPage() {
  const [tab, setTab] = useState<"menu" | "orders">("menu");
  return (
    <StaffGate need="admin" title="Admin – login">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 p-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl text-accent">La Scuderia · Admin</h1>
          <div className="flex items-center gap-4 text-sm">
            <a href="/create" target="_blank" className="rounded-lg border border-line px-3 py-2">
              Previzualizare ↗
            </a>
            <a href="/bar" target="_blank" className="rounded-lg border border-line px-3 py-2">
              Dashboard bar ↗
            </a>
            <SignOut />
          </div>
        </header>
        <nav className="flex gap-2">
          {(
            [
              ["menu", "Băuturi & prețuri"],
              ["orders", "Istoric comenzi"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === key ? "bg-accent text-accent-ink" : "bg-surface text-muted"}`}
            >
              {label}
            </button>
          ))}
        </nav>
        {tab === "menu" ? <AdminMenu /> : <AdminOrders />}
      </main>
    </StaffGate>
  );
}
