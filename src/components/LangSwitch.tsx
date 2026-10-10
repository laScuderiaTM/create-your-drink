"use client";

import { useLang } from "@/lib/i18n";

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex rounded-full border border-line p-0.5 text-xs font-semibold">
      {(["ro", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-full px-3 py-1.5 uppercase transition ${
            lang === l ? "bg-accent text-accent-ink" : "text-muted"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
