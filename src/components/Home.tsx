"use client";

import Link from "next/link";
import { LangSwitch } from "@/components/LangSwitch";
import { Logo } from "@/components/Logo";
import { useLang } from "@/lib/i18n";
import { MENU_URL } from "@/lib/types";

export function Home() {
  const { t, lang } = useLang();
  return (
    <>
      <div className="checkered h-4 w-full" />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-6">
        <div className="flex justify-end">
          <LangSwitch />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
          <Logo size="lg" />
          <div>
            <Divider />
            <h1 className="my-4 font-display text-5xl leading-tight">
              {lang === "en" ? (
                <>
                  Create <em className="text-accent">your</em> <em className="text-accent">drink.</em>
                </>
              ) : (
                <>
                  Creează-ți <em className="text-accent">băutura</em> <em className="text-accent">ta.</em>
                </>
              )}
            </h1>
            <p className="text-muted">{t.tagline}</p>
            <Divider />
          </div>
          <div className="flex w-full flex-col gap-4">
            <Link
              href="/create"
              className="rounded-full bg-accent px-6 py-4 text-lg font-semibold text-accent-ink shadow-lg shadow-accent/20 transition active:scale-[0.98]"
            >
              {t.createDrink}
            </Link>
            <a
              href={MENU_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border-2 border-accent px-6 py-4 text-lg font-semibold text-accent transition active:scale-[0.98]"
            >
              {t.ourMenu}
            </a>
          </div>
        </div>
      </main>
      <div className="checkered h-4 w-full" />
      <div className="h-2 w-full bg-accent" />
    </>
  );
}

function Divider() {
  return (
    <div className="mx-auto flex max-w-[240px] items-center gap-3 text-accent">
      <span className="h-px flex-1 bg-accent/60" />
      <span className="text-[10px]">◆</span>
      <span className="h-px flex-1 bg-accent/60" />
    </div>
  );
}
