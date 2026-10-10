"use client";

import Link from "next/link";
import { LangSwitch } from "@/components/LangSwitch";
import { useLang } from "@/lib/i18n";
import { MENU_URL } from "@/lib/types";

export function Home() {
  const { t } = useLang();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-6">
      <div className="flex justify-end">
        <LangSwitch />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted">Bar · Café</p>
          <h1 className="mt-2 font-display text-5xl text-accent">La Scuderia</h1>
          <p className="mt-3 text-muted">{t.tagline}</p>
        </div>
        <div className="flex w-full flex-col gap-4">
          <Link
            href="/create"
            className="rounded-2xl bg-accent px-6 py-5 text-lg font-semibold text-accent-ink shadow-lg shadow-accent/10 active:scale-[0.98] transition"
          >
            {t.createDrink}
          </Link>
          <a
            href={MENU_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-line px-6 py-5 text-lg font-semibold active:scale-[0.98] transition"
          >
            {t.ourMenu}
          </a>
        </div>
      </div>
    </main>
  );
}
