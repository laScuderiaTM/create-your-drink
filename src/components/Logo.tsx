/**
 * Logo-ul La Scuderia. `public/logo.png` e generat din `public/logo_fundal_negru.png`
 * (decupat, cu negrul transparent), ca să stea curat pe fundalul închis al site-ului.
 */
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const height = { sm: "h-10", md: "h-20", lg: "h-36" }[size];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="La Scuderia" width={1000} height={534} className={`${height} w-auto`} />
  );
}
