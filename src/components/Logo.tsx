"use client";

import { useState } from "react";

/**
 * Logo-ul La Scuderia. Pune fișierul în `public/logo.png` (ideal PNG cu fundal transparent).
 * Până atunci se afișează o variantă text în stilul logo-ului.
 */
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const [missing, setMissing] = useState(false);
  const height = { sm: "h-10", md: "h-20", lg: "h-36" }[size];

  if (!missing) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/logo.png"
        alt="La Scuderia"
        className={`${height} w-auto`}
        onError={() => setMissing(true)}
        // Eroarea poate apărea înainte de hidratare; o verificăm și la montare.
        ref={(el) => {
          if (el?.complete && el.naturalWidth === 0) setMissing(true);
        }}
      />
    );
  }

  const text = { sm: "text-xl px-4 py-1", md: "text-3xl px-6 py-2", lg: "text-5xl px-9 py-4" }[size];
  return (
    <span
      className={`inline-block -rotate-3 rounded-[2rem] bg-black font-script text-white ring-4 ring-accent ${text}`}
    >
      La Scuderia
    </span>
  );
}
