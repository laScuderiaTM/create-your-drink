"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

export type Lang = "ro" | "en";

const dict = {
  ro: {
    tagline: "Băutura ta, exact cum o vrei.",
    createDrink: "Creează-ți băutura",
    ourMenu: "Meniul nostru",
    chooseType: "Alege tipul băuturii",
    from: "de la",
    baseIncluded: "Pahar + gheață incluse",
    back: "Înapoi",
    next: "Continuă",
    optional: "Opțional",
    chooseBetween: (min: number, max: number) =>
      min === max ? `Alege ${min}` : min > 0 ? `Alege între ${min} și ${max}` : `Până la ${max}`,
    outOfStock: "Epuizat",
    total: "Total",
    summary: "Rezumat",
    base: "Bază (pahar + gheață)",
    yourName: "Prenumele tău",
    table: "Masa",
    adult: "Confirm că am peste 18 ani",
    adultNote: "Barmanul poate cere un act de identitate.",
    send: "Trimite comanda",
    sending: "Se trimite…",
    thanks: "Comanda a fost trimisă!",
    yourCode: "Codul comenzii tale",
    showCode: "Arată acest cod la bar dacă ți se cere.",
    newDrink: "Încă o băutură",
    home: "Acasă",
    loading: "Se încarcă…",
    error: "A apărut o eroare. Încearcă din nou.",
    noCategories: "Momentan nu se pot crea băuturi.",
    priceNote: "Prețul final este confirmat la bar.",
  },
  en: {
    tagline: "Your drink, exactly how you like it.",
    createDrink: "Create your drink",
    ourMenu: "Our menu",
    chooseType: "Choose your drink type",
    from: "from",
    baseIncluded: "Glass + ice included",
    back: "Back",
    next: "Next",
    optional: "Optional",
    chooseBetween: (min: number, max: number) =>
      min === max ? `Choose ${min}` : min > 0 ? `Choose ${min} to ${max}` : `Up to ${max}`,
    outOfStock: "Sold out",
    total: "Total",
    summary: "Summary",
    base: "Base (glass + ice)",
    yourName: "Your first name",
    table: "Table",
    adult: "I confirm I am over 18",
    adultNote: "The bartender may ask for ID.",
    send: "Send order",
    sending: "Sending…",
    thanks: "Your order has been sent!",
    yourCode: "Your order code",
    showCode: "Show this code at the bar if asked.",
    newDrink: "Another drink",
    home: "Home",
    loading: "Loading…",
    error: "Something went wrong. Please try again.",
    noCategories: "Drink creation is unavailable right now.",
    priceNote: "Final price is confirmed at the bar.",
  },
};

export type Dict = (typeof dict)["ro"];

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: Dict }>({
  lang: "ro",
  setLang: () => {},
  t: dict.ro,
});

// Limba aleasă se ține în localStorage (cu fallback în memorie dacă storage-ul e blocat).
const listeners = new Set<() => void>();
let memoryLang: Lang = "ro";

function readLang(): Lang {
  try {
    const saved = localStorage.getItem("lang");
    if (saved === "ro" || saved === "en") return saved;
  } catch {}
  return memoryLang;
}

function setLang(l: Lang) {
  memoryLang = l;
  try {
    localStorage.setItem("lang", l);
  } catch {}
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function LangProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, () => "ro" as Lang);

  return <LangContext.Provider value={{ lang, setLang, t: dict[lang] }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/** Alege câmpul `_ro` / `_en` dintr-un obiect, cu fallback pe română. */
export function pick<T extends object>(obj: T, field: string, lang: Lang): string {
  const o = obj as Record<string, unknown>;
  const en = o[`${field}_en`];
  if (lang === "en" && typeof en === "string" && en.trim()) return en;
  return String(o[`${field}_ro`] ?? "");
}
